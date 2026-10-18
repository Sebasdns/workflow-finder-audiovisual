export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['es', 'en'];

const en = {
  'brand': 'Workflow Finder Audiovisual',
  'service.checking': 'Checking service...',
  'service.available': 'Service available',
  'service.unavailable': 'Service unavailable',
  'landing.eyebrow': 'PREPRODUCTION, WITH INTENTION',
  'landing.title': 'Turn a creative brief into a production-ready blueprint.',
  'landing.description': 'Structure constraints, dependencies and critical decisions before production begins.',
  'empty.blueprint.title': 'No Blueprint yet',
  'empty.blueprint.body': 'Submit a creative brief to generate a production plan. Conflicts and human decisions will appear when the Blueprint identifies them.',
  'form.brief': 'Creative Brief', 'form.duration': 'Duration', 'form.deadline': 'Deadline',
  'form.tools': 'Available tools', 'form.deliverable': 'Expected deliverable',
  'form.help': 'Separate available tools with commas. Optional fields may be left empty.',
  'action.build': 'BUILD BLUEPRINT', 'action.new': 'NEW BRIEF', 'action.review': 'REVIEW HUMAN DECISION',
  'action.apply': 'APPLY DECISION', 'action.back': 'BACK TO BLUEPRINT', 'action.viewUpdated': 'VIEW UPDATED BLUEPRINT',
  'processing.title': 'Shaping your production...', 'processing.analyzing': 'Analyzing brief',
  'processing.structuring': 'Structuring production', 'processing.checking': 'Checking consistency',
  'processing.preparing': 'Preparing blueprint', 'processing.center': 'Your direction stays at the center.',
  'workspace': 'YOUR PRODUCTION WORKSPACE', 'objective': 'Objective', 'constraints': 'Constraints',
  'characterWorld': 'Character / World', 'scenesCamera': 'Scenes / Shots / Camera', 'productionNext': 'Production Next',
  'characters': 'Character requirements', 'world': 'World requirements', 'scenes': 'Scenes & shot plan',
  'camera': 'Camera directions', 'dependencies': 'Dependencies', 'conflicts': 'Conflicts',
  'gates': 'Approval gates', 'nextSteps': 'Production next steps',
  'empty.info': 'No information is available yet.',
  'empty.characters': 'No character requirements were returned.', 'empty.world': 'No world requirements were returned.',
  'empty.scenes': 'No scenes or shots were returned.', 'empty.shots': 'No shots were returned for this scene.',
  'empty.dependencies': 'No production dependencies were identified.', 'empty.conflicts': 'No conflicts require human review.',
  'empty.gates': 'No approval gates were returned.', 'empty.steps': 'No production next steps were returned.',
  'empty.changes': 'The backend returned no changes for this revision.',
  'human.eyebrow': 'AI STRUCTURES. HUMANS DECIDE.', 'human.title': 'HUMAN DECISION',
  'human.current': 'Current requirements', 'human.proposed': 'Proposed decision',
  'human.noProposal': 'No proposed decision was returned. Enter the direction to apply.',
  'human.yourDecision': 'Your decision', 'human.comment': 'Comment', 'human.approve': 'Approve', 'human.modify': 'Modify', 'optional': 'optional',
  'revised.label': 'Revised Blueprint',
  'revised.eyebrow': 'BLUEPRINT UPDATED', 'revised.title': 'Your direction. A revised plan.',
  'revised.changes': 'Returned changes', 'before': 'BEFORE', 'after': 'AFTER',
  'footer': 'AI structures. Humans decide.', 'sequence': 'Production sequence',
  'notPresent': 'Not present', 'noneSpecified': 'None specified', 'linkedStep': 'Linked production step',
  'error.brief': 'Please enter a creative brief.', 'error.decision': 'Please enter your decision.',
  'error.INVALID_INPUT': 'Please review your brief or decision and try again.',
  'error.INVALID_MODEL_OUTPUT': 'The production plan could not be read. Please try again.',
  'error.SCHEMA_VALIDATION_ERROR': 'The production plan is incomplete. Please try again.',
  'error.MODEL_ERROR': 'The planning service is unavailable. Your work is still here.',
  'error.MODEL_TIMEOUT': 'Planning took too long. Please try again.',
  'error.NOT_FOUND': 'The planning service could not be reached.',
  'error.NETWORK': 'Connection interrupted. Check that the planning service is running.',
  'field.summary': 'Summary', 'field.target_audience': 'Target audience', 'field.deliverables': 'Deliverables',
  'field.success_criteria': 'Success criteria', 'field.budget': 'Budget', 'field.schedule': 'Schedule',
  'field.runtime': 'Runtime', 'field.delivery_format': 'Delivery format', 'field.aspect_ratio': 'Aspect ratio',
  'field.creative': 'Creative', 'field.technical': 'Technical', 'field.legal_and_safety': 'Legal and safety',
  'field.audio_requirements': 'Audio requirements', 'field.lighting_requirements': 'Lighting requirements',
  'field.production_notes': 'Production notes', 'field.framing': 'Framing', 'field.movement': 'Movement',
  'field.angle': 'Angle', 'field.lens': 'Lens', 'field.focus': 'Focus', 'field.support': 'Support',
  'field.owner': 'Owner', 'field.due_date': 'Due date',
  'status.pending': 'Pending', 'status.approved': 'Approved', 'status.modified': 'Modified'
};

const es = {
  ...en,
  'brand': 'Workflow Finder Audiovisual',
  'service.checking': 'Comprobando servicio...', 'service.available': 'Servicio disponible', 'service.unavailable': 'Servicio no disponible',
  'landing.eyebrow': 'PREPRODUCCIÓN, CON INTENCIÓN', 'landing.title': 'Convierte un brief creativo en un Blueprint listo para producción.',
  'landing.description': 'Estructura restricciones, dependencias y decisiones críticas antes de iniciar la producción.',
  'empty.blueprint.title': 'Aún no hay Blueprint', 'empty.blueprint.body': 'Envía un brief creativo para generar un plan de producción. Los conflictos y las decisiones humanas aparecerán cuando el Blueprint los identifique.',
  'form.brief': 'Brief creativo', 'form.duration': 'Duración', 'form.deadline': 'Fecha límite', 'form.tools': 'Herramientas disponibles',
  'form.deliverable': 'Entregable esperado', 'form.help': 'Separa las herramientas disponibles con comas. Los campos opcionales pueden dejarse vacíos.',
  'action.build': 'CREAR BLUEPRINT', 'action.new': 'NUEVO BRIEF', 'action.review': 'REVISAR DECISIÓN HUMANA',
  'action.apply': 'APLICAR DECISIÓN', 'action.back': 'VOLVER AL BLUEPRINT', 'action.viewUpdated': 'VER BLUEPRINT ACTUALIZADO',
  'processing.title': 'Dando forma a tu producción...', 'processing.analyzing': 'Analizando el brief',
  'processing.structuring': 'Estructurando la producción', 'processing.checking': 'Comprobando consistencia',
  'processing.preparing': 'Preparando el Blueprint', 'processing.center': 'Tu dirección permanece en el centro.',
  'workspace': 'TU ESPACIO DE PRODUCCIÓN', 'objective': 'Objetivo', 'constraints': 'Restricciones',
  'characterWorld': 'Personajes / Mundo', 'scenesCamera': 'Escenas / Planos / Cámara', 'productionNext': 'Siguiente en producción',
  'characters': 'Requisitos de personajes', 'world': 'Requisitos del mundo', 'scenes': 'Plan de escenas y planos',
  'camera': 'Direcciones de cámara', 'dependencies': 'Dependencias', 'conflicts': 'Conflictos',
  'gates': 'Puertas de aprobación', 'nextSteps': 'Próximos pasos de producción',
  'empty.info': 'Aún no hay información disponible.',
  'empty.characters': 'No se devolvieron requisitos de personajes.', 'empty.world': 'No se devolvieron requisitos del mundo.',
  'empty.scenes': 'No se devolvieron escenas ni planos.', 'empty.shots': 'No se devolvieron planos para esta escena.',
  'empty.dependencies': 'No se identificaron dependencias de producción.', 'empty.conflicts': 'Ningún conflicto requiere revisión humana.',
  'empty.gates': 'No se devolvieron puertas de aprobación.', 'empty.steps': 'No se devolvieron próximos pasos de producción.',
  'empty.changes': 'El backend no devolvió cambios para esta revisión.',
  'human.eyebrow': 'LA IA ESTRUCTURA. LAS PERSONAS DECIDEN.', 'human.title': 'DECISIÓN HUMANA',
  'human.current': 'Requisitos actuales', 'human.proposed': 'Decisión propuesta',
  'human.noProposal': 'No se devolvió una decisión propuesta. Introduce la dirección que deseas aplicar.',
  'human.yourDecision': 'Tu decisión', 'human.comment': 'Comentario', 'human.approve': 'Aprobar', 'human.modify': 'Modificar', 'optional': 'opcional',
  'revised.label': 'Blueprint revisado',
  'revised.eyebrow': 'BLUEPRINT ACTUALIZADO', 'revised.title': 'Tu dirección. Un plan revisado.',
  'revised.changes': 'Cambios devueltos', 'before': 'ANTES', 'after': 'DESPUÉS',
  'footer': 'La IA estructura. Las personas deciden.', 'sequence': 'Secuencia de producción',
  'notPresent': 'No presente', 'noneSpecified': 'No especificado', 'linkedStep': 'Paso de producción vinculado',
  'error.brief': 'Introduce un brief creativo.', 'error.decision': 'Introduce tu decisión.',
  'error.INVALID_INPUT': 'Revisa el brief o la decisión e inténtalo de nuevo.',
  'error.INVALID_MODEL_OUTPUT': 'No se pudo leer el plan de producción. Inténtalo de nuevo.',
  'error.SCHEMA_VALIDATION_ERROR': 'El plan de producción está incompleto. Inténtalo de nuevo.',
  'error.MODEL_ERROR': 'El servicio de planificación no está disponible. Tu trabajo sigue aquí.',
  'error.MODEL_TIMEOUT': 'La planificación tardó demasiado. Inténtalo de nuevo.',
  'error.NOT_FOUND': 'No se pudo acceder al servicio de planificación.',
  'error.NETWORK': 'Conexión interrumpida. Comprueba que el servicio de planificación esté activo.',
  'field.summary': 'Resumen', 'field.target_audience': 'Público objetivo', 'field.deliverables': 'Entregables',
  'field.success_criteria': 'Criterios de éxito', 'field.budget': 'Presupuesto', 'field.schedule': 'Calendario',
  'field.runtime': 'Duración', 'field.delivery_format': 'Formato de entrega', 'field.aspect_ratio': 'Relación de aspecto',
  'field.creative': 'Creativo', 'field.technical': 'Técnico', 'field.legal_and_safety': 'Legal y seguridad',
  'field.audio_requirements': 'Requisitos de audio', 'field.lighting_requirements': 'Requisitos de iluminación',
  'field.production_notes': 'Notas de producción', 'field.framing': 'Encuadre', 'field.movement': 'Movimiento',
  'field.angle': 'Ángulo', 'field.lens': 'Óptica', 'field.focus': 'Foco', 'field.support': 'Soporte',
  'field.owner': 'Responsable', 'field.due_date': 'Fecha límite',
  'status.pending': 'Pendiente', 'status.approved': 'Aprobado', 'status.modified': 'Modificado'
};

const dictionaries = { en, es };

export function normalizeLanguage(value) { return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE; }
export function initialLanguage(storage) {
  try { return normalizeLanguage(storage?.getItem('workflow-finder-language')); } catch { return DEFAULT_LANGUAGE; }
}
export function persistLanguage(storage, language) {
  const normalized = normalizeLanguage(language);
  try { storage?.setItem('workflow-finder-language', normalized); } catch { /* storage is optional */ }
  return normalized;
}
export function translate(language, key) { return dictionaries[normalizeLanguage(language)][key] ?? en[key] ?? key; }
export function modelText(value) { return value; }
export function healthState(response) { return response?.status === 'ok' ? 'available' : 'unavailable'; }
export function canReviseConflict(conflict) { return Boolean(conflict?.conflict_id && conflict.decision_required); }
export function hasRevisableConflict(blueprint) { return Boolean(blueprint?.conflicts?.some(canReviseConflict)); }
