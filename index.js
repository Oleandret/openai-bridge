import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Endepunkt for ElevenLabs-kompatibel API
app.post('/v1/chat/completions', async (req, res) => {
    try {
        const { messages, model = 'gpt-4', temperature = 0.7, max_tokens = 1000 } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Meldinger mangler eller er i feil format.' });
        }

        console.log('Mottok forespørsel:', messages);

        // Send forespørselen til OpenAI
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens,
                function_call: 'auto', // La OpenAI håndtere funksjonskall
            }),
        });

        const jsonResponse = await openaiResponse.json();
        console.log('Respons fra OpenAI:', jsonResponse);

        // Returner responsen direkte til klienten
        res.json(jsonResponse);
    } catch (error) {
        console.error('Feil i /v1/chat/completions:', error);
        res.status(500).json({ error: 'Noe gikk galt under behandling av forespørselen.' });
    }
});

// Start serveren
app.listen(port, () => {
    console.log(`Server kjører på port ${port}`);
});
