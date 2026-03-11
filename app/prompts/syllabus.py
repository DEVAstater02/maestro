SYLLABUS_GENERATION_PROMPT = '''
You will be generating a comprehensive syllabus structure in JSON format for a voice AI tutoring agent. This syllabus will guide an AI tutor through teaching a specific educational topic to a student via voice interaction.

Here are the inputs you'll be working with:

<topic>
{{TOPIC}}
</topic>

<user_persona>
{{USER_PERSONA}}
</user_persona>

<subject>
{{SUBJECT}}
</subject>

Your task is to create a detailed, pedagogically sound syllabus structure that follows the JSON format below. The syllabus should be appropriate for the given grade level and subject, and should break down the topic into teachable content nodes.

**Required JSON Structure:**

Your output must include these top-level fields:

1. **module_id**: A unique identifier in the format: `{subject_abbreviation}_{grade}_{topic_slug}` (e.g., "math_07_fractions")

2. **metadata**: An object containing:
   - `subject`: The subject area
   - `grade_level`: The grade level (as a number)
   - `estimated_duration_minutes`: Realistic time estimate (10-30 minutes typical)
   - `difficulty_modifier`: Either "remedial", "standard", or "advanced"

3. **learning_objectives**: An array of 3-5 specific, measurable learning goals. Each should start with an action verb (Identify, Explain, Calculate, Describe, etc.)

4. **content_nodes**: An array of 3-7 teaching segments. Each node must include:
   - `node_id`: Unique identifier (e.g., "intro_01", "concept_01_main_idea")
   - `title`: Short, student-friendly title
   - `concept`: One clear sentence explaining the core idea
   - `voice_hook` (for intro nodes): An engaging question or statement to capture attention
   - `analogy_options` (optional): Object with 2-3 relatable analogies from different contexts (gaming, sports, cooking, nature, everyday life, etc.)
   - `vocabulary` (when applicable): Array of 2-4 key terms introduced
   - `check_for_understanding`: A Socratic question or prompt to verify comprehension
   - `voice_instruction` (optional): Guidance for the AI tutor on tone or approach
   - `required_for_next`: Boolean indicating if mastery is needed before proceeding

5. **assessment_logic**: An object containing:
   - `exit_quiz_type`: Type of assessment ("Socratic Discussion", "Problem Set", "Explanation Task", etc.)
   - `min_mastery_score`: Decimal between 0 and 1 (typically 0.7-0.9)
   - `remediation_path`: Module ID for review if student struggles

6. **guardrails**: An object containing:
   - `max_tangent_count`: Number of off-topic diversions allowed (1-3)
   - `forbidden_topics`: Array of concepts too advanced or off-scope
   - `tone_setting`: Description of the AI tutor's voice personality

**Important Guidelines:**

- Design content nodes in logical teaching order, building from foundational to complex concepts
- Voice hooks should be conversational and age-appropriate
- Analogies should connect to experiences relevant to the grade level
- Socratic questions should guide discovery, not just test recall
- Keep vocabulary lists focused on essential terms only
- Ensure the tone setting matches the grade level (playful for elementary, more mature for high school)
- The first node should typically be an introduction that activates prior knowledge
- Include at least one node with analogy_options to support different learning styles
- Make sure forbidden_topics prevent the AI from going too deep or off-track

**Output Format:**

Provide your complete syllabus as valid JSON. Do not include any text before or after the JSON structure. Ensure all JSON syntax is correct (proper quotes, commas, brackets).

Begin generating the syllabus now:
'''