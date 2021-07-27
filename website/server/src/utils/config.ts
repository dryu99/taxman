import { config } from 'dotenv';

// load .env contents into process.env
config();

const PORT = process.env.PORT || 3002;

export default { PORT };
