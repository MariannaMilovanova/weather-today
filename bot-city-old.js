const { Telegraf, Scenes, session } = require('telegraf');
const axios = require('axios');
const language = require('@google-cloud/language');

const TELEGRAM_TOKEN = '6640501130:AAGx8jmKdpvu2DpUSY_TUHXKwIZhQM_S0DI';
const WEATHER_API_KEY = '3e1eddebb35d2e838c304dd5f0de07db';
const WEATHER_API_URL = 'http://api.openweathermap.org/data/2.5/weather';
const getWeatherLocationUrl = ({lat, lon}, apikey) => `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid={apikey}`;
const getWeatherCityUrl = (city, apikey) => `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apikey}`


// Створіть клієнта Google Cloud Natural Language API
const client = new language.LanguageServiceClient();

const botCityOld = new Telegraf(TELEGRAM_TOKEN);

let user_data = {};

const stage = new Scenes.Stage();

botCityOld.use(session());
botCityOld.use(stage.middleware());
botCityOld.start((ctx) => {
    ctx.scene.enter('getCountry');
});

const getCountryScene = new Scenes.BaseScene('getCountry');

getCountryScene.enter((ctx) => {
    ctx.reply('Будь ласка, введіть назву вашої країни.');
});

getCountryScene.hears(/.*/, (ctx) => {
    user_data[ctx.chat.id] = { country: ctx.message.text };
    ctx.scene.enter('getCity');
});


const getCityScene = new Scenes.BaseScene('getCity');
getCityScene.enter((ctx) => {
    ctx.reply('Будь ласка, введіть назву вашого міста.');
});

getCityScene.hears(/.*/, async (ctx) => {
    user_data[ctx.chat.id].city = ctx.message.text;
    const chatId = ctx.chat.id;
    const city = user_data[ctx.chat.id].city;

    await sendWeather(chatId, city);
    const text = "Я знаходжусь у Києві";
    // Тут можна додати код для збереження даних користувача і налаштування щоденної відправки погоди
    //ctx.reply("Дякую! Я буду надсилати вам погоду щодня о 10:00 за вашим місцевим часом.");
    const location = await parseLocation(text);
    if (location) {
        console.log(`Місце: ${location}`);
    } else {
        console.log("Місце не знайдено");
    }
    ctx.scene.leave();
});

stage.register(getCountryScene, getCityScene);


botCityOld.launch();

async function sendWeather(chatId, city) {
    try {
        const response = await axios.get(WEATHER_API_URL, {
            params: {
                q: city,
                appid: WEATHER_API_KEY,
                units: 'metric', // Для отримання температури в градусах Цельсія
                lang: 'ua' // Для отримання прогнозу на українській мові
            }
        });

        const weather = response.data;
        const message = `Погода в ${city}: ${weather.main.temp}°C, ${weather.weather[0].description}`;
        await botCityOld.telegram.sendMessage(chatId, message);
    } catch (error) {
        console.error("Error fetching weather:", error);
        await botCityOld.telegram.sendMessage(chatId, "Вибачте, виникла помилка під час отримання погоди.");
    }
}

// Парсінг тексту, щоб витягнути місцезнаходження
async function parseLocation(text) {
    try {
        const document = {
            content: text,
            type: 'PLAIN_TEXT',
        };

        const [result] = await client.analyzeEntities({document});
        const entities = result.entities;

        for (const entity of entities) {
            if (entity.type === 'LOCATION') {
                return entity.name;
            }
        }

        return null;
    } catch (error) {
        console.error('Error parsing location:', error);
        return null;
    }
}