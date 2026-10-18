import * as api from './api.js';

export function createService() {
  return {
    health: () => api.request('health'),
    generate: api.generate,
    revise: api.revise
  };
}
