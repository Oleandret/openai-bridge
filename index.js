import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import { OpenAI } from 'openai';

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

// Endepunkt for tekstmeldinger
app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Melding mangler i forespørselen.' });
        }

        console.log('Mottok melding:', message);

        // Opprett en thread i OpenAI
        const thread = await openai.beta.threads.create();
        await openai.beta.threads.messages.create(thread.id, {
            role: 'user',
            content: message,
        });

        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: ASSISTANT_ID,
        });

        // Vent på at OpenAI-assistenten fullfører
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status !== 'completed') {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        // Hent OpenAI-svaret
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        const assistantResponse = lastMessage?.content?.[0]?.text?.value || 'Ingen respons mottatt.';

        console.log('OpenAI svar:', assistantResponse);

        res.json({ response: assistantResponse });
    } catch (error) {
        console.error('Feil i /chat:', error);
        res.status(500).json({ error: 'Noe gikk galt under behandling av forespørselen.' });
    }
});

// Endepunkt for lydmeldinger
app.post('/audio-chat', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Ingen lydfil mottatt.' });
        }

        console.log('Mottok lydfil:', req.file);

        // Transkriber lyd til tekst (pseudo, da ElevenLabs ikke har spesifikk implementasjon i koden din)
        const userMessage = "Dette er en transkribert melding"; // Placeholder

        console.log('Transkribert tekst:', userMessage);

        // Opprett en thread i OpenAI
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

        // Hent OpenAI-svaret
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        const assistantResponse = lastMessage?.content?.[0]?.text?.value || 'Ingen respons mottatt.';

        console.log('OpenAI svar:', assistantResponse);

        res.json({ response: assistantResponse });

        // Slett midlertidig lydfil
        fs.unlinkSync(req.file.path);
    } catch (error) {
        console.error('Feil i /audio-chat:', error);
        res.status(500).json({ error: 'Noe gikk galt under behandling av forespørselen.' });
    }
});

// Start serveren
app.listen(port, () => {
    console.log(`Server kjører på port ${port}`);
});
