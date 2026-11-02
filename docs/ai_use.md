# Use of AI in this project

## Tools
- Claude (Anthropic), via claude.ai, model Claude Sonnet 5.5 — planning the build,
  writing and revising the step-by-step prompts, advising on NASA and NOAA data
  sources, reading the data files we collected to check their fields, drafting
  storm-record.json from the NOAA files we supplied, and a Python script that cut
  the terrain files from the Moon Trek elevation data.
- [Google AI Studio / Gemini, list the model you use] — code generation from the
  prompts in docs/prompts_used.md.
- GitHub Copilot — building the file tree.
- [Any other tool, for example an image AI used for story backgrounds]

## What the AI did
- Drafted the build plan and the prompt set (MISSION27_Build_Plan.md,
  docs/prompts_used.md).
- Suggested which NASA and NOAA datasets could drive each scenario.
- Ran a script that read the LOLA elevation file, found the flattest 1.28 km
  window, and exported small height files plus metadata.
- Structured the storm record from NOAA files that we downloaded and pasted in.
- [Generated code files, listed per prompt step, with the tool that wrote them]

## What the AI did not do
- The game concept, story, design system, scenario choices and the decision to
  cut scope are ours.
- We chose the data sources, downloaded them ourselves, and checked each one,
  including the flare and proton values in storm-record.json against the
  NOAA SWPC files.
- [List your own writing, art, testing and design work here]

## How AI is kept away from the numbers
- Real values come from files in assets/data. Calculations live in
  src/compute as small tested functions (tests/compute.html). The game does not
  call an AI model while it runs.
- Anything the game computes or invents is labelled MISSION27 SIMULATION.

## Prompts
Final prompt set: docs/prompts_used.md (Prompts 0 to 12, with the tool and date
for each run). Cut from the original plan: merch store, rover driving and extra
data sources.

## Generated content
- Preview images of the terrain were produced by script from NASA data.
- [Any AI-generated images, sounds or text, with the tool named]