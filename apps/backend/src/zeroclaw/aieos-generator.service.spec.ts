import { Test, TestingModule } from '@nestjs/testing';
import { AieosGeneratorService } from './aieos-generator.service';

describe('AieosGeneratorService', () => {
  let service: AieosGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AieosGeneratorService],
    }).compile();

    service = module.get<AieosGeneratorService>(AieosGeneratorService);
  });

  describe('validate()', () => {
    it('should accept a valid AIEOS payload', () => {
      const payload = {
        standard: { protocol: 'AIEOS', version: '1.1.0', schema_url: '' },
        identity: {},
        psychology: {},
        linguistics: {},
        history: {},
        capabilities: { skills: [] },
      };
      expect(service.validate(payload)).toBe(true);
    });

    it('should reject an invalid payload missing required sections', () => {
      const payload = { standard: {}, identity: {} };
      expect(service.validate(payload)).toBe(false);
    });

    it('should reject null', () => {
      expect(service.validate(null as any)).toBe(false);
    });
  });

  describe('generate()', () => {
    it('should produce all 5 required AIEOS sections', () => {
      const result = service.generate({
        displayName: 'Bot',
        aieos_identity: null,
      });
      expect(result).toHaveProperty('standard');
      expect(result).toHaveProperty('identity');
      expect(result).toHaveProperty('psychology');
      expect(result).toHaveProperty('linguistics');
      expect(result).toHaveProperty('history');
      expect(result).toHaveProperty('capabilities');
    });

    it('should use displayName in identity when no aieos_identity', () => {
      const result = service.generate({ displayName: 'DevBot' });
      expect(result.identity.names.first).toBe('DevBot');
    });

    it('should merge existing aieos_identity values', () => {
      const result = service.generate({
        displayName: 'Bot',
        aieos_identity: { identity: { names: { first: 'Custom' } } },
      });
      expect(result.identity.names.first).toBe('Custom');
    });
  });

  describe('serialize()', () => {
    it('should return valid JSON string', () => {
      const payload = service.generate({ displayName: 'Bot' });
      const serialized = service.serialize(payload);
      expect(() => JSON.parse(serialized)).not.toThrow();
      expect(JSON.parse(serialized)).toHaveProperty('standard');
    });
  });

  describe('generateIdentityJson()', () => {
    it('should be backwards compatible with generate()', () => {
      const result = service.generateIdentityJson({ displayName: 'Bot' });
      expect(result).toHaveProperty('standard');
    });
  });
});
