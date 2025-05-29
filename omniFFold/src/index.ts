// Entry point for the omniFFold application
import { createServer } from './server';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        const server = await createServer();
        server.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Error starting the server:', error);
    }
};

startServer();