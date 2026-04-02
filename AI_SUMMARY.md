# AI Summary

This summary was generated with Claude's assistance.

## Overview

AI was used as an engineering assistant throughout this project. It was not used
as an autonomous replacement for design or review. The main pattern was to make
the architectural decisions in writing first, then use AI to help implement,
stress test, refine, and document those decisions.

## How AI Was Used

- Early in the project, AI was used to sanity check implementation plans and to
  help edit technical prose for clarity.
- Once requirements and constraints were written down in
  `docs/DEVELOPMENT.md`, AI was used to turn those requirements into initial
  implementations more quickly.
- AI was used to help review naming and data flow, but final decisions remained
  human directed. In particular, the issue with overuse of `trusted`
  terminology in client-visible or otherwise not-yet-validated data was caught
  on the human side and then corrected in the implementation.
- AI was used to help wire the OpenAI integration, including request shape,
  output limits, retries, timeout handling, and fallback behavior.
- AI was used to add and extend tests rather than only generate feature code.
  This included coverage for cache behavior, user isolation, refresh
  deduplication, recent-fact history, and favorite movie reassignment.

## Where AI Helped Identify Problems

- AI helped surface a missed fallback requirement during the OpenAI integration
  work.
- After implementation, a real double-refresh bug was discovered in practice.
  AI helped implement both client-side and server-side protections.
- When the first server-side protection was only process-local, the improved
  request-time fence design came from the human side. AI's role was to
  implement that design once it had been specified.
- Repeated fact generations being too similar was identified during a live demo
  for another person. AI then assisted with prompt-level mitigations, including
  temperature tuning and passing recent fact history.
- AI suggested stronger duplicate-topic handling ideas, but those suggestions
  were evaluated critically and not adopted where they added too much latency or
  complexity for this project.

## What Was Still Human Directed

- The overall architecture and tradeoff decisions were human directed.
- Decisions about trust boundaries, prompt injection risk, data validation, and
  client-visible naming were made explicitly rather than delegated to AI.
- AI output was reviewed, corrected, and in some cases rejected when it pushed
  toward weaker terminology or overcomplicated solutions.
- The project documentation reflects deliberate reasoning about why certain
  suggestions were accepted and others were not.

## Net Effect

AI primarily accelerated implementation, debugging, and test writing while also
serving as a second set of eyes on edge cases. The important value was not just
faster code generation, but quicker iteration on concerns that emerged both in
planning and in real behavior during development.