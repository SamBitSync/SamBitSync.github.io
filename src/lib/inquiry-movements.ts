export type Movement = 'autopsy' | 'ship';
export const movements = {
 autopsy: { title: 'Black-Box Autopsy', question: 'What process produced this?' },
 ship: { title: 'Neurath’s Ship', question: 'What else does this change?' },
} as const;
