import { test } from 'node:test';
import assert from 'node:assert/strict';
import fixture from './fixtures/blueprint.valid.json' with { type: 'json' };
import { assertBlueprint, briefPayload, request, messages } from '../src/api.js';
test('fixture follows frozen schema; unknown properties are rejected', () => {
  assert.equal(assertBlueprint(fixture), fixture);
  assert.throws(() => assertBlueprint({ ...fixture, invented: true }));
});
test('brief sends exactly the five frozen fields', () => {
  const form = new FormData(); form.set('brief',' A film '); form.set('available_tools',' Camera, tripod, ');
  assert.deepEqual(briefPayload(form), {brief:'A film',duration:null,deadline:null,available_tools:['Camera','tripod'],expected_deliverable:null});
});
test('revision request retains complete blueprint and exact human decision', async () => {
  const decision={conflict_id:'eyes',selected_option:'Restore eyes',comment:''};
  await request('blueprint/revise',{blueprint:fixture,decision},async(url,options) => {
    assert.equal(url,'/api/blueprint/revise'); assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),{blueprint:fixture,decision});
    return {ok:true,json:async() => ({blueprint:fixture,changes:[]})};
  });
});
test('provider errors never expose raw message or traces',async() => {
  for(const code of Object.keys(messages).filter(x => x !== 'NETWORK')) {
    await assert.rejects(request('blueprint/generate',{},async() => ({ok:false,json:async() => ({error:code,message:'SECRET TRACE'})})),{message:messages[code]});
  }
  await assert.rejects(request('health',null,async() => {throw new Error('SECRET');}),{message:messages.NETWORK});
});
