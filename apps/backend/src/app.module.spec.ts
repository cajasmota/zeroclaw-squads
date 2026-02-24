import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('ConfigModule', () => {
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              APP_NAME: 'TestAES',
              MONGODB_URI: 'mongodb://localhost:27017/test',
              JWT_SECRET: 'test-secret-32-chars-long-string!',
              JWT_EXPIRES_IN: '7d',
              BACKEND_PORT: 3001,
            }),
          ],
        }),
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  it('should resolve APP_NAME from env', () => {
    expect(configService.get('APP_NAME')).toBe('TestAES');
  });

  it('should resolve MONGODB_URI from env', () => {
    expect(configService.get('MONGODB_URI')).toBe('mongodb://localhost:27017/test');
  });

  it('should resolve JWT_SECRET from env', () => {
    expect(configService.get('JWT_SECRET')).toBe('test-secret-32-chars-long-string!');
  });

  it('should resolve JWT_EXPIRES_IN from env', () => {
    expect(configService.get('JWT_EXPIRES_IN')).toBe('7d');
  });

  it('should resolve BACKEND_PORT from env', () => {
    expect(configService.get('BACKEND_PORT')).toBe(3001);
  });
});
