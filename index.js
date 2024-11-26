import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Helsesjekk-endepunkt
app.get('/', (req, res) => {
    res.json({ status: 'OpenAI ElevenLabs Bridge is running' });
});

// Endepunkt for ElevenLabs-kompatibel API
app.post('/v1/chat/completions', async (req, res) => {
    try {
        const {
            messages,
            model = 'gpt-4',
            temperature = 0.7,
            max_tokens = 1000,
            stream = false,
            elevenlabs_extra_body
        } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Meldinger mangler eller er i feil format.' });
        }

        console.log('Mottok forespørsel:', req.body);

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
                stream,
                user: elevenlabs_extra_body?.UUID || undefined,
            }),
        });

        if (!openaiResponse.ok) {
            const error = await openaiResponse.json();
            console.error('Feil fra OpenAI:', error);
            return res.status(openaiResponse.status).json({ error });
        }

        // Håndter streaming-respons
        if (stream) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.flushHeaders();

            const reader = openaiResponse.body.getReader();
            const decoder = new TextDecoder();

            let done = false;
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;

                const chunk = decoder.decode(value, { stream: true });
                console.log('Streaming chunk:', chunk);
                res.write(`data: ${chunk}\n\n`);
            }
            res.write('data: [DONE]\n\n');
            res.end();
        } else {
            // Håndter standard JSON-respons
            const jsonResponse = await openaiResponse.json();
            console.log('OpenAI respons:', jsonResponse);
            res.json(jsonResponse);
        }
    } catch (error) {
        console.error('Feil i /v1/chat/completions:', error);
        res.status(500).json({ error: 'Noe gikk galt under behandling av forespørselen.' });
    }
});

// Start serveren
app.listen(port, () => {
    console.log(`Server kjører på port ${port}`);
});
