import { parseEditCommands } from './src/lib/itineraryChatAi';
import { normalizeTimeInput } from './src/lib/itineraryDraftEdits';

const times = ['2pm', '2:30 PM', '14:00', '9am', '9', '3', '11', 'noon'];
for (const t of times) console.log(`time ${JSON.stringify(t)} ->`, normalizeTimeInput(t));

const commands = [
  'change stop 3 to 2pm',
  'move Pedro Farms to 10:30 am',
  'set stop 2 time to 1pm - 3pm',
  'replace stop 2 with Ilog Maria Honeybee Farms',
  'swap Pedro Farms for Cornerstone Pottery',
  'remove stop 5',
  'delete Pedro Farms',
  'add Ilog Maria after stop 1',
  'insert Cornerstone Pottery',
  'make a 2 day itinerary for Tagaytay',
  'hello there',
];
for (const c of commands) console.log(`\n${c}\n ->`, JSON.stringify(parseEditCommands(c)));
