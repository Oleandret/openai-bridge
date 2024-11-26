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
    res.json({ status: 'OpenAI Bridge is running' });
});

// Hovedendpoint for meldinger
app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Opprett en ny thread
        const thread = await openai.beta.threads.create();
        
        // Legg til meldingen i thread
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: message
        });
        
        // Start en kjøring med assistenten
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: ASSISTANT_ID
        });
        
        // Vent på at kjøringen skal fullføres
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        
        while (runStatus.status !== 'completed') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
            
            if (runStatus.status === 'failed') {
                throw new Error('Assistant run failed');
            }
        }
        
        // Hent alle meldinger i threaden
        const messages = await openai.beta.threads.messages.list(thread.id);
        
        // Hent den siste meldingen (assistentens svar)
        const lastMessage = messages.data[0];
        const response = lastMessage.content[0].text.value;
        
        res.json({ response });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server kjører på port ${port}`);
});
