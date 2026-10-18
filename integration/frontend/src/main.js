import './style.css';
import { briefPayload, messages } from './api.js';
import { createService } from './service.js';
import { mountAtmosphere } from './atmosphere.js';
import { canReviseConflict, healthState, initialLanguage, modelText, persistLanguage, translate } from './i18n.js';

const disposeAtmosphere = mountAtmosphere();
if (import.meta.hot) import.meta.hot.dispose(disposeAtmosphere);
const service = createService();
const app = document.querySelector('#app');
const state = { view: 'brief', blueprint: null, previous: null, changes: [], conflict: null, decision: {}, error: '', health: 'checking', brief: {}, language: initialLanguage(globalThis.localStorage) };

const t = key => translate(state.language, key);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const fallbackLabel = value => String(value).replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
const label = value => {
  const field = t(`field.${value}`);
  if (field !== `field.${value}`) return field;
  const status = t(`status.${value}`);
  return status !== `status.${value}` ? status : fallbackLabel(value);
};
const empty = message => `<p class="muted empty-state">${escape(message)}</p>`;
function list(items) { return items?.length ? `<ul>${items.map(item => `<li>${escape(modelText(item))}</li>`).join('')}</ul>` : ''; }
function details(object, excluded = []) { return Object.entries(object).filter(([key, value]) => !excluded.includes(key) && !key.endsWith('_id') && !key.endsWith('_ids') && (!Array.isArray(value) || value.length > 0)).map(([key, value]) => `<div class="detail"><span>${escape(label(key))}</span>${Array.isArray(value) ? list(value) : `<p>${escape(modelText(value))}</p>`}</div>`).join(''); }
function section(title, content, cls = '', emptyMessage = t('empty.info')) { return `<section class="panel ${cls}"><h2>${escape(title)}</h2>${content || empty(emptyMessage)}</section>`; }
function index(blueprint) {
  const entries = [...blueprint.character_requirements.map(x => ['character', x.character_id, x]), ...blueprint.world_requirements.locations.map(x => ['location', x.location_id, x]), ...blueprint.scenes.flatMap(x => [['scene', x.scene_id, x], ...x.shots.map(shot => ['shot', shot.shot_id, shot])]), ...blueprint.dependencies.map(x => ['dependency', x.dependency_id, x]), ...blueprint.conflicts.map(x => ['conflict', x.conflict_id, x]), ...blueprint.approval_gates.map(x => ['approval_gate', x.approval_gate_id, x]), ...blueprint.next_steps.map(x => ['next_step', x.step_id, x])];
  return new Map(entries.map(([type, id, value]) => [`${type}:${id}`, value]));
}
function ref(reference, blueprint = state.blueprint) { const item = index(blueprint).get(`${reference.element_type}:${reference.element_id}`); return modelText(item?.name || item?.title || item?.description) || label(reference.element_type); }
function errorText(error) {
  if (error === 'brief') return t('error.brief');
  if (error === 'decision') return t('error.decision');
  const code = Object.keys(messages).find(key => messages[key] === error);
  return code ? t(`error.${code}`) : error;
}

function briefView() {
  const fields = [['duration','form.duration'], ['deadline','form.deadline'], ['available_tools','form.tools'], ['expected_deliverable','form.deliverable']];
  return `<div class="intro"><p class="eyebrow">${t('landing.eyebrow')}</p><h1>${t('landing.title')}</h1><p>${t('landing.description')}</p></div><section class="panel empty-state" aria-live="polite"><h2>${t('empty.blueprint.title')}</h2><p>${t('empty.blueprint.body')}</p></section><form id="brief-form" class="panel brief"><label>${t('form.brief')}<textarea name="brief" required rows="5">${escape(state.brief.brief)}</textarea></label><div class="fields">${fields.map(([key,title]) => `<label>${t(title)}<input name="${key}" value="${escape(state.brief[key])}"></label>`).join('')}</div><p class="muted">${t('form.help')}</p><div class="actions"><button type="submit">${t('action.build')} <span>↗</span></button></div></form>`;
}

function blueprintView() {
  const b = state.blueprint;
  const characters = b.character_requirements.map(item => `<article><h3>${escape(modelText(item.name))}</h3>${details(item, ['name'])}</article>`).join('');
  const world = details(b.world_requirements, ['locations']) + b.world_requirements.locations.map(item => `<article><h3>${escape(modelText(item.name))}</h3>${details(item, ['name'])}</article>`).join('');
  const scenes = b.scenes.map((scene, i) => {
    const shots = scene.shots.map(shot => `<article class="shot"><p class="eyebrow">${escape(modelText(shot.shot_size))}</p><h3>${escape(modelText(shot.description))}</h3><p class="muted">${escape(shot.character_ids.map(id => ref({element_type:'character',element_id:id})).join(', '))}${shot.location_id ? ` · ${escape(ref({element_type:'location',element_id:shot.location_id}))}` : ''}</p>${details(shot,['description','shot_size','camera_directions'])}<h4>${t('camera')}</h4>${details(shot.camera_directions)}</article>`).join('');
    return `<details class="scene" open><summary><span class="number">${String(i + 1).padStart(2,'0')}</span>${escape(modelText(scene.title))}</summary><p>${escape(modelText(scene.description))}</p><p class="muted">${escape(ref({element_type:'location',element_id:scene.location_id}))} · ${escape(scene.character_ids.map(id => ref({element_type:'character',element_id:id})).join(', '))}</p>${details(scene,['title','description','shots'])}${shots || empty(t('empty.shots'))}</details>`;
  }).join('');
  const dependencies = b.dependencies.map(item => `<article class="relationship"><p class="eyebrow">${escape(label(item.status || 'unspecified'))}</p><h3>${escape(ref(item.required_element))} → ${escape(ref(item.dependent_element))}</h3><p>${escape(modelText(item.description))}</p></article>`).join('');
  const conflicts = b.conflicts.map((item,i) => `<article><p class="eyebrow">${escape(label(item.severity))}</p><h3>${escape(modelText(item.description))}</h3>${list(item.affected_elements.map(reference => ref(reference)))}${item.resolution_notes ? `<p>${escape(modelText(item.resolution_notes))}</p>` : ''}${canReviseConflict(item) ? `<button class="gold" data-decision="${i}">${t('action.review')} ↗</button>` : ''}</article>`).join('');
  const gates = b.approval_gates.map(item => `<article><p class="eyebrow">${escape(label(item.status))}</p><h3>${escape(modelText(item.description))}</h3><p>${escape(modelText(item.proposed_decision))}</p>${item.human_decision ? details(item.human_decision) : ''}</article>`).join('');
  const nextSteps = b.next_steps.map(item => `<article><p class="eyebrow">${escape(label(item.production_area))} · ${escape(label(item.status))}</p><h3>${escape(modelText(item.action))}</h3>${details(item,['action','production_area','status','related_elements'])}${item.related_elements ? list(item.related_elements.map(reference => ref(reference))) : ''}${item.depends_on_step_ids?.length ? list(item.depends_on_step_ids.map(id => b.next_steps.find(step => step.step_id === id)?.action || t('linkedStep'))) : ''}</article>`).join('');
  return `<div class="heading"><div><p class="eyebrow">${t('workspace')}</p><h1>${escape(modelText(b.objective.summary))}</h1></div><button class="secondary" id="new">${t('action.new')}</button></div>${section(t('objective'), details(b.objective))}${section(t('constraints'), details(b.constraints))}<nav class="sequence" aria-label="${t('sequence')}"><a href="#characters">${t('characterWorld')}</a><span>→</span><a href="#scenes">${t('scenesCamera')}</a><span>→</span><a href="#next">${t('productionNext')}</a></nav><div id="characters" class="columns">${section(t('characters'), characters, '', t('empty.characters'))}${section(t('world'), world, '', t('empty.world'))}</div><div id="scenes">${section(t('scenes'), scenes, '', t('empty.scenes'))}</div>${section(t('dependencies'), dependencies, '', t('empty.dependencies'))}<div class="columns">${section(t('conflicts'), conflicts, 'conflicts', t('empty.conflicts'))}${section(t('gates'), gates, 'approval', t('empty.gates'))}</div><div id="next">${section(t('nextSteps'), nextSteps, '', t('empty.steps'))}</div>`;
}

function decisionView() {
  const conflict = state.conflict, b = state.blueprint;
  const gate = b.approval_gates.find(item => item.approval_gate_id === conflict.approval_gate_id || item.conflict_ids?.includes(conflict.conflict_id));
  return `<div class="intro"><p class="eyebrow human">${t('human.eyebrow')}</p><h1>${escape(modelText(conflict.description))}</h1></div><form id="decision-form" class="panel approval"><p class="eyebrow">${escape(label(conflict.severity))} · ${t('human.title')}</p><h2>${t('human.current')}</h2>${details(b.constraints)}${list(conflict.affected_elements.map(reference => { const item = index(b).get(`${reference.element_type}:${reference.element_id}`); return `${ref(reference)}${item?.continuity_notes ? ' — ' + item.continuity_notes.join('; ') : ''}`; }))}<h2>${t('human.proposed')}</h2><p>${escape(modelText(gate?.proposed_decision) || t('human.noProposal'))}</p><label>${t('human.yourDecision')}<textarea name="selected_option" required rows="3">${escape(modelText(gate?.proposed_decision))}</textarea></label><label>${t('human.comment')} <span class="muted">(${t('optional')})</span><textarea name="comment" rows="2"></textarea></label><div class="actions"><button class="gold" type="submit">${t('action.apply')} ↗</button><button class="secondary" type="button" id="back">${t('action.back')}</button></div></form>`;
}
function changeValue(blueprint, change) { if (change.element_type === 'objective' || change.element_type === 'constraints' || change.element_type === 'world_requirements') return blueprint[change.element_type]; return index(blueprint).get(`${change.element_type}:${change.element_id}`); }
function readable(value) {
  if (value === undefined) return t('notPresent');
  if (Array.isArray(value)) return value.map(readable).join(' · ') || t('noneSpecified');
  if (value && typeof value === 'object') return Object.entries(value).filter(([key]) => !key.endsWith('_id') && !key.endsWith('_ids')).map(([key,item]) => `${label(key)}: ${readable(item)}`).join(' · ');
  return String(modelText(value));
}
function revisedView() { return `<div class="intro"><p class="eyebrow success">${t('revised.eyebrow')}</p><h1>${t('revised.title')}</h1></div>${section(t('revised.changes'), state.changes.map(change => `<article><p class="eyebrow">${escape(label(change.element_type))} · ${escape(label(change.change_type))}</p><div class="columns comparison"><div><h3>${t('before')}</h3><p>${escape(readable(changeValue(state.previous,change)))}</p></div><div><h3>${t('after')}</h3><p>${escape(readable(changeValue(state.blueprint,change)))}</p></div></div></article>`).join(''), '', t('empty.changes'))}<button id="back">${t('action.viewUpdated')} ↗</button>`; }

function captureDraft() {
  const briefForm = app.querySelector('#brief-form');
  if (briefForm) state.brief = Object.fromEntries(new FormData(briefForm));
  const decisionForm = app.querySelector('#decision-form');
  if (decisionForm) state.decision = { selected_option: decisionForm.elements.selected_option.value, comment: decisionForm.elements.comment.value };
}
function languageSelector() { return `<div class="language" role="group" aria-label="Language"><button type="button" data-language="es" aria-pressed="${state.language === 'es'}">ES</button><span>|</span><button type="button" data-language="en" aria-pressed="${state.language === 'en'}">EN</button></div>`; }
function render() {
  app.innerHTML = `<header><a class="brand" href="#" id="home" aria-label="${t('brand')}"><span class="brand-icon">W/</span>Workflow Finder <span class="muted">Audiovisual</span></a><div class="header-controls">${languageSelector()}<span class="service" data-status="${state.health}">${t(`service.${state.health}`)}</span></div></header><main>${state.error ? `<div class="error" role="alert">${escape(errorText(state.error))}</div>` : ''}${state.view === 'brief' ? briefView() : state.view === 'processing' ? `<section class="processing" aria-live="polite" aria-busy="true"><div class="orb"></div><h1>${t('processing.title')}</h1><p id="progress">${t('processing.analyzing')}</p><p class="muted">${t('processing.center')}</p></section>` : state.view === 'decision' ? decisionView() : state.view === 'revised' ? revisedView() : blueprintView()}</main><footer><div class="snow-ground" aria-hidden="true"><svg viewBox="0 0 1440 160" preserveAspectRatio="none"><defs><linearGradient id="snow-ridge" x2="0" y2="1"><stop stop-color="#f4f4ff"/><stop offset=".5" stop-color="#c5c7ed"/><stop offset="1" stop-color="#e0ddf8"/></linearGradient><linearGradient id="snow-front" x2="0" y2="1"><stop stop-color="#f9f6ff"/><stop offset="1" stop-color="#d3d8f2"/></linearGradient></defs><path d="M0 75 Q100 24 240 73 T550 62 T890 58 T1200 50 T1440 60 V160 H0Z" fill="#aeaeda"/><path d="M0 96 Q180 115 330 58 Q430 28 590 78 T950 68 Q1120 18 1270 62 T1440 82 V160 H0Z" fill="url(#snow-ridge)"/><path d="M0 125 Q180 74 360 110 T730 115 T1090 95 T1440 108 V160 H0Z" fill="url(#snow-front)"/></svg></div><span>© Workflow Finder Audiovisual</span><span>${t('footer')}</span></footer>`;
  app.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => { captureDraft(); state.language = persistLanguage(globalThis.localStorage, button.dataset.language); render(); }));
  app.querySelector('#home')?.addEventListener('click', event => { event.preventDefault(); if(state.view !== 'processing') { state.view = state.blueprint ? 'blueprint' : 'brief'; state.error=''; render(); } });
  app.querySelector('#brief-form')?.addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.target); state.brief = Object.fromEntries(form); const payload=briefPayload(form); if(!payload.brief) { state.error='brief'; render(); return; } await work(() => service.generate(payload), 'brief', result => { state.blueprint=result; state.view='blueprint'; }); });
  app.querySelector('#new')?.addEventListener('click', () => { state.view='brief'; state.error=''; render(); });
  app.querySelector('#back')?.addEventListener('click', () => { state.view='blueprint'; state.error=''; render(); });
  app.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => { state.conflict=state.blueprint.conflicts[Number(button.dataset.decision)]; state.decision={}; state.view='decision'; state.error=''; render(); window.scrollTo(0,0); }));
  const decisionForm=app.querySelector('#decision-form');
  if(decisionForm && state.decision.selected_option !== undefined) { decisionForm.elements.selected_option.value=state.decision.selected_option; decisionForm.elements.comment.value=state.decision.comment; }
  decisionForm?.addEventListener('submit', async event => { event.preventDefault(); const form = new FormData(event.target); const decision = {conflict_id:state.conflict.conflict_id,selected_option:String(form.get('selected_option')).trim(),comment:String(form.get('comment')).trim()}; state.decision=decision; if(!decision.selected_option) { state.error='decision'; render(); return; } await work(() => service.revise(state.blueprint,decision), 'decision', result => { state.previous=state.blueprint; state.blueprint=result.blueprint; state.changes=result.changes; state.view='revised'; }); });
}

function updateHealth(status) { state.health = status; const badge = app.querySelector('.service'); if (badge) { badge.dataset.status = status; badge.textContent = t(`service.${status}`); } }
async function checkHealth() { try { updateHealth(healthState(await service.health())); } catch { updateHealth('unavailable'); } }
async function work(operation, fallback, success) {
  state.error=''; state.view='processing'; render(); window.scrollTo(0,0);
  const steps=['processing.analyzing','processing.structuring','processing.checking','processing.preparing']; let step=0;
  const timer=setInterval(() => { const element=document.querySelector('#progress'); if(element) element.textContent=t(steps[Math.min(++step,3)]); },3500);
  try { const result = await operation(); updateHealth('available'); success(result); }
  catch(error) { state.error=error.message; state.view=fallback; updateHealth(error.message === messages.NETWORK || error.message === messages.NOT_FOUND ? 'unavailable' : 'available'); }
  finally { clearInterval(timer); render(); }
}

render();
checkHealth();
const healthTimer = setInterval(checkHealth, 30000);
if (import.meta.hot) import.meta.hot.dispose(() => clearInterval(healthTimer));
