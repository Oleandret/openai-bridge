// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// OpenAI konfigurasjon
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

app.use(cors());
app.use(express.json());

// Helsesjekk endpoint
app.get('/', (req, res) => {
    console.log('Helsesjekk utført');
    res.json({ status: 'OpenAI Bridge is running' });
});

// Hovedendpoint for meldinger
app.post('/chat', async (req, res) => {
    console.log('Mottok chat-forespørsel:', req.body);
    try {
        const { message } = req.body;
        console.log('Behandler melding:', message);
        
        // Opprett en ny thread
        console.log('Oppretter ny thread...');
        const thread = await openai.beta.threads.create();
        console.log('Thread opprettet:', thread.id);
        
        // Legg til meldingen i thread
        console.log('Legger til melding i thread...');
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: message
        });
        
        // Start en kjøring med assistenten
        console.log('Starter assistant run...');
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: ASSISTANT_ID
        });
        
        // Vent på at kjøringen skal fullføres
        console.log('Venter på run completion...');
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        
        while (runStatus.status !== 'completed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            console.log('Run status:', runStatus.status);
            
            if (runStatus.status === 'failed') {
                throw new Error('Assistant run failed');
            }
        }
        
        // Hent alle meldinger i threaden
        console.log('Henter meldinger...');
        const messages = await openai.beta.threads.messages.list(thread.id);
        
        // Hent den siste meldingen (assistentens svar)
        const lastMessage = messages.data[0];
        const response = lastMessage.content[0].text.value;
        
        console.log('Sender svar:', response);
        res.json({ response });
        
    } catch (error) {
        console.error('Error i /chat endpoint:', error);
        res.status(500).json({ 
            error: error.message,
            stack: error.stack
        });
    }
});

app.listen(port, () => {
    console.log(`Server kjører på port ${port}`);
    console.log('Assistant ID:', ASSISTANT_ID);
    console.log('OpenAI API Key satt:', !!process.env.OPENAI_API_KEY);
});
