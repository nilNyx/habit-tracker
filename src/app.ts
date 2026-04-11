import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import userRouter from './routes/user.routes.js'
import authRouter from './routes/auth.routes.js'
import habitsRouter from './routes/habits.routes.js'
import logsRouter from './routes/logs.routes.js'
import { errorHandler } from "./middleware/errorHandler.js";
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from "./swagger.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/users', userRouter);
app.use('/auth', authRouter);
app.use('/habits', habitsRouter);
app.use('/logs', logsRouter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(errorHandler);


app.listen(3000, () => console.log('http://localhost:3000'));