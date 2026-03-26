// Jest setup file for global test configuration

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
process.env.LIGHTHOUSE_API_KEY = 'test_api_key_for_jest';
process.env.NODE_ENV = 'test';
