import Ajv from 'ajv/dist/2020.js';
import formats from 'ajv-formats';
import schema from './contracts/blueprint.schema.json' with { type: 'json' };
const ajv = new Ajv({ strict: false });
formats(ajv);
const validate = ajv.compile(schema);
export const messages = {
  INVALID_INPUT: 'Please review your brief or decision and try again.',
  INVALID_MODEL_OUTPUT: 'The production plan could not be read. Please try again.',
  SCHEMA_VALIDATION_ERROR: 'The production plan is incomplete. Please try again.',
  MODEL_ERROR: 'The planning service is unavailable. Your work is still here.',
  MODEL_TIMEOUT: 'Planning took too long. Please try again.',
  NOT_FOUND: 'The planning service could not be reached.',
  NETWORK: 'Connection interrupted. Check that the planning service is running.'
};
export function assertBlueprint(value) {
  if (!validate(value)) throw new Error(messages.SCHEMA_VALIDATION_ERROR);
  return value;
}
export function briefPayload(form) {
  const optional = key => String(form.get(key) ?? '').trim() || null;
  return { brief: optional('brief'), duration: optional('duration'), deadline: optional('deadline'), available_tools: String(form.get('available_tools') ?? '').split(',').map(x => x.trim()).filter(Boolean), expected_deliverable: optional('expected_deliverable') };
}
export async function request(path, payload, fetcher = fetch) {
  let response;
  try {
    response = await fetcher(`/api/${path}`, { method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(150000) });
  } catch(error) { throw new Error(error.name === 'TimeoutError' ? messages.MODEL_TIMEOUT : messages.NETWORK); }
  let data;
  try { data = await response.json(); } catch { throw new Error(response.ok ? messages.INVALID_MODEL_OUTPUT : response.status === 404 ? messages.NOT_FOUND : messages.NETWORK); }
  if (!response.ok) throw new Error(messages[data?.error] || messages.MODEL_ERROR);
  return data;
}
export async function generate(payload) { return assertBlueprint(await request('blueprint/generate', payload)); }
export async function revise(blueprint, decision) {
  const data = await request('blueprint/revise', { blueprint, decision });
  assertBlueprint(data?.blueprint);
  const types = ['objective','constraints','character','world_requirements','location','scene','shot','dependency','conflict','approval_gate','next_step'];
  if (!Array.isArray(data.changes) || data.changes.some(c => !c || !types.includes(c.element_type) || !['added','removed','modified'].includes(c.change_type) || (c.element_id !== undefined && typeof c.element_id !== 'string'))) throw new Error(messages.INVALID_MODEL_OUTPUT);
  return data;
}
