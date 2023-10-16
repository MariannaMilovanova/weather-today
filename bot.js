const { Telegraf, Scenes, session } = require('telegraf');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_URL = 'http://api.openweathermap.org/data/2.5/weather';

const bot = new Telegraf(TELEGRAM_TOKEN);
const sessionMiddleware = new session();
// Сцена для отримання локації
const getLocationScene = new Scenes.BaseScene('getLocation');

// Окрема асинхронна функція для отримання погоди
async function getWeatherByLocation(ctx, latitude, longitude) {
    try {
        const response = await axios.get(WEATHER_API_URL, {
            params: {
                lat: latitude,
                lon: longitude,
                appid: WEATHER_API_KEY,
                units: 'metric',
                lang: 'ua',
            }
        });

        const weather = response.data;
        const message = `Погода: ${weather.weather[0].description}\nТемпература: ${weather.main.temp}°C`;
        ctx.reply(message);
    } catch (error) {
        console.error('Помилка запиту до API погоди:', error);
        ctx.reply('Виникла помилка під час отримання погоди.');
    }
}
getLocationScene.enter((ctx) => {
    ctx.reply('Ласкаво просимо! Надішліть своє місцезнаходження, щоб отримувати погоду.');
});

// Обробка локації типу повідомлення "location"
getLocationScene.on('location', async (ctx) => {
    const { latitude, longitude } = ctx.message.location;
    await getWeatherByLocation(ctx, latitude, longitude);
    ctx.scene.leave();
});

// Додавання сцени до бота
bot.use(sessionMiddleware);
const stage = new Scenes.Stage([getLocationScene]);
bot.use(stage.middleware());

// Обробка команди /start
bot.command('start', (ctx) => ctx.scene.enter('getLocation'));

bot.launch();
