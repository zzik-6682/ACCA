import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import * as express from 'express';
import * as path from 'path';
import { HttpStatusInterceptor } from '@/interceptors/http-status.interceptor';

function parsePort(): number {
  const args = process.argv.slice(2);
  const portIndex = args.indexOf('-p');
  if (portIndex !== -1 && args[portIndex + 1]) {
    const port = parseInt(args[portIndex + 1], 10);
    if (!isNaN(port) && port > 0 && port < 65536) {
      return port;
    }
  }
  // 开发模式下使用 SERVER_PORT（前端和 API 分开端口）
  const serverPort = parseInt(process.env.SERVER_PORT || '', 10);
  if (!isNaN(serverPort) && serverPort > 0 && serverPort < 65536) {
    return serverPort;
  }
  // 生产模式下使用 DEPLOY_RUN_PORT（前后端合并单端口）
  const envPort = parseInt(process.env.DEPLOY_RUN_PORT || '', 10);
  if (!isNaN(envPort) && envPort > 0 && envPort < 65536) {
    return envPort;
  }
  // 外部部署（Railway 等平台设置 PORT 环境变量）
  const port = parseInt(process.env.PORT || '', 10);
  if (!isNaN(port) && port > 0 && port < 65536) {
    return port;
  }
  return 3000;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // 静态文件服务：上传目录
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
  
  // 静态文件服务：生产环境 H5 构建产物
  const staticPath = path.resolve(__dirname, '../../dist-web');
  app.use(express.static(staticPath));
  
  // SPA fallback：非 API 路径返回 index.html
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  // 全局拦截器：统一将 POST 请求的 201 状态码改为 200
  app.useGlobalInterceptors(new HttpStatusInterceptor());
  // 1. 开启优雅关闭 Hooks (关键!)
  app.enableShutdownHooks();

  // 2. 解析端口
  const port = parsePort();
  try {
    await app.listen(port);
    console.log(`Server running on http://localhost:${port}`);
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ 端口 \({port} 被占用! 请运行 'npx kill-port \){port}' 然后重试。`);
      process.exit(1);
    } else {
      throw err;
    }
  }
  console.log(`Application is running on: http://localhost:3000`);
}
bootstrap();
