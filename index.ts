// src/config.ts
import { z } from 'zod';
import React from 'react';
import { html } from '@elysiajs/html';
import ReactDOM from 'react-dom/server';
  // Enable HTML support

// Serve static HTML with the React app


const envSchema = z.object({
  PORT: z.string().default('3000'),
  PYTHON_SERVER_URL: z.string().default('http://216.81.245.7:42781'),
  API_KEY: z.string().default('test-api-key'),
});
const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://localhost:8000';
export const config = envSchema.parse(process.env);

// src/server.ts
import { Elysia } from 'elysia';
// import { config } from './config';
import { performance } from 'perf_hooks';

const app = new Elysia()





// Chat completions endpoint
app.post('/v1/chat/completions', async ({ body, set }) => {
  try {
    const response = await fetch(`${PYTHON_SERVER_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      set.headers['Content-Type'] = 'text/event-stream';
      return response.body;
    }

    return response.json();
  } catch (error) {
    console.error('Error in chat completions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});



// Benchmark Endpoint
const BENCHMARK_PROMPTS = [
    "Explain quantum computing in simple terms.",
    "Write a short story about a robot.",
    "What are the benefits of exercise?",
    "How does photosynthesis work?",
    "Explain the concept of blockchain.",
    // Add more diverse prompts as needed
  ];
  
  app.post('/benchmark', async ({ body }) => {
    const { number_of_requests, max_tokens = 100, temperature = 0.7 } = body;
    const startTime = performance.now();
    
    // Generate test cases using sample prompts
    const testCases = Array(number_of_requests).fill(0).map((_, i) => ({
      model: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: BENCHMARK_PROMPTS[i % BENCHMARK_PROMPTS.length]
        }
      ],
      max_tokens,
      temperature,
      stream: false
    }));
  
    const results = await Promise.allSettled(
      testCases.map(async (testCase) => {
        const requestStart = performance.now();
        try {
          const response = await fetch(`${PYTHON_SERVER_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCase)
          });
  
          const result = await response.json();
          return {
            request: testCase,
            response: result.choices[0].message.content,
            status: 'Succeeded' as const,
            latency: performance.now() - requestStart,
            finishedAt: new Date().toISOString()
          };
        } catch (error) {
          return {
            request: testCase,
            status: 'Failed' as const,
            latency: performance.now() - requestStart,
            finishedAt: new Date().toISOString(),
            error: error.message
          };
        }
      })
    );
  
    const latencies = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r.status === 'fulfilled' ? r.value.latency : 0))
      .sort((a, b) => a - b);
  
    const benchmarkResults = {
      total_response_time_in_milliseconds_p50: getPercentile(latencies, 50),
      total_response_time_in_milliseconds_p90: getPercentile(latencies, 90),
      total_response_time_in_milliseconds_p99: getPercentile(latencies, 99),
      average_latency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      total_succeeded: results.filter(r => r.status === 'fulfilled').length,
      total_failed: results.filter(r => r.status === 'rejected').length,
      number_of_requests,
      total_time: performance.now() - startTime,
      requests_per_second: (results.filter(r => r.status === 'fulfilled').length / 
        ((performance.now() - startTime) / 1000)),
      // requests_and_responses: results.map(result => 
      //   result.status === 'fulfilled' ? result.value : result.reason
      // )
    };
  
    await Bun.write('benchmark-results.json', JSON.stringify(benchmarkResults, null, 2));
    return benchmarkResults;
  });

app.listen(parseInt(config.PORT));
console.log(`Server running at http://0.0.0.0:${config.PORT}`);
console.log(`Connecting to Python server at ${config.PYTHON_SERVER_URL}`);

// Helper functions
function generatePrompts(count: number): string[] {
  return Array(count).fill(0).map((_, i) => 
    `Generate a response for benchmark test ${i + 1}`
  );
}

function getPercentile(results: any[], percentile: number): number {
  const values = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value.latency)
    .sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * values.length) - 1;
  return values[index] || 0;
}

