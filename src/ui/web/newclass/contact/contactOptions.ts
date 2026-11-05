export const CONTACT_TOPICS = ['A-guy', 'לומדים ללמד', 'שתי התוכניות', 'עוד לא בטוחים'] as const

export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const DEFAULT_TOPIC: ContactTopic = 'עוד לא בטוחים'

export const CONTACT_ROLES = ['מנהל/ת בית ספר', 'מורה', 'הורה', 'אחר'] as const
