import { initBotId } from 'botid/client/core';

// Protect the subscribe endpoint from bots
initBotId({
  protect: [
    {
      path: '/api/subscribe',
      method: 'POST',
    },
  ],
});

