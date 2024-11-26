import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import { OpenAI } from 'openai';
import ElevenLabs from 'elevenlabs-api';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Konfigurer OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

// Konfigurer multer for å motta lydfiler
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());

// Helsesjekk-endepunkt
app.get('/', (req, res) => {
    res.json({ status: 'OpenAI ElevenLabs Bridge is running' });
});

// Endepunkt for tekstmeldinger (hvis ElevenLabs sender tekst direkte)
app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        console.log('Mottok melding:', message);

        // Send meldingen til OpenAI
        const thread = await openai.beta.threads.create();
        await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: message,
        });

        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: ASSISTANT_ID,
        });

        // Vent på at OpenAI fullfører
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status !== 'completed') {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        // Hent svaret fra OpenAI
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        const assistantResponse = lastMessage.content[0].text.value;

        console.log('OpenAI svar:', assistantResponse);

        // Returner svaret til ElevenLabs-agenten
        res.json({ response: assistantResponse });
    } catch (error) {
        console.error('Feil i /chat:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endepunkt for lydmeldinger (hvis ElevenLabs sender lyd som input)
app.post('/audio-chat', upload.single('audio'), async (req, res) => {
    try {
        console.log('Mottok lydfil:', req.file);

        // Transkriber lyd til tekst med ElevenLabs
        const transcription = await ElevenLabs.transcribe({
            audio: fs.createReadStream(req.file.path),
            language: 'no', // Norsk
        });

        const userMessage = transcription.transcription;
        console.log('Transkribert tekst:', userMessage);

        // Send teksten til OpenAI
        const thread = await openai.beta.threads.create();
        await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: userMessage,
        });

        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: ASSISTANT_ID,
        });

        // Vent på at OpenAI fullfører
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status !== 'completed') {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        // Hent svaret fra OpenAI
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        const assistantResponse = lastMessage.content[0].text.value;

        console.log('OpenAI svar:', assistantResponse);

        // Returner tekstsvaret til ElevenLabs-agenten
        res.json({ response: assistantResponse });

        // Slett midlertidig lydfil
        fs.unlinkSync(req.file.path);
    } catch (error) {
        console.error('Feil i /audio-chat:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server kjører på port ${port}`);
});
