SYLLABUS_GENERATION_PROMPT = '''
You will generate a comprehensive syllabus structure in JSON format for a voice AI tutoring agent. This syllabus will guide an AI tutor through teaching a specific educational topic to a student via voice interaction.

Here are the inputs you will work with:

<topic>
{{TOPIC}}
</topic>

<grade_level>
{{GRADE_LEVEL}}
</grade_level>

<subject>
{{SUBJECT}}
</subject>

# Your Task

Create a detailed, pedagogically sound syllabus structure in JSON format. The syllabus should be appropriate for the given grade level and subject, and should break down the topic into teachable content nodes that build logically from foundational to more complex concepts.

Before generating the final JSON, work through your planning in <syllabus_planning> tags:

1. **Concept Analysis**: List out all the key concepts within this topic. Separate them into:
   - Foundational concepts (must be taught first)
   - Intermediate concepts (build on foundations)
   - Advanced concepts (require prior understanding)

2. **Learning Objectives**: Draft 3-5 specific, measurable learning objectives. For each objective, note which concepts it relates to and ensure it uses an appropriate action verb (Identify, Explain, Calculate, Describe, Compare, Apply, etc.).

3. **Content Node Planning**: Plan out 3-7 content nodes in sequence. For each node:
   - Write the node_id, title, and a draft of the concept statement
   - Note which learning objective(s) this node addresses
   - Verify it logically builds on the previous node
   - Draft the check_for_understanding question

4. **Optional Fields Validation**: For each content node, explicitly decide:
   - Does this node need a voice_hook? (Usually only the first node)
   - Does this node introduce essential vocabulary terms that must be listed?
   - Is mastery of this node absolutely required before proceeding? (set required_for_next)
   - Only include these fields when you can justify why they're necessary

5. **Assessment and Guardrails**: 
   - Choose the most appropriate exit_quiz_type for this topic and grade level
   - List potential forbidden topics that might derail the lesson or are beyond scope
   - Define the appropriate tone for this grade level

It's OK for this section to be quite long. Thoroughness here will ensure a better final syllabus.

# Required JSON Structure

Your JSON output must include these fields:

## Top-Level Required Fields

1. **module_id** (string): A unique identifier using the format `{subject_abbreviation}_{grade}_{topic_slug}`
   - Example: "math_07_fractions" or "sci_10_photosynthesis"

2. **metadata** (object): Contains essential information about the module
   - `subject` (string): The subject area
   - `grade_level` (number): The grade level as a number
   - `estimated_duration_minutes` (number): Realistic time estimate (typically 10-30 minutes)

3. **learning_objectives** (array): 3-5 specific, measurable learning goals
   - Each objective should start with an action verb (Identify, Explain, Calculate, Describe, Compare, Apply, etc.)
   - Each objective should be clear about what the student will be able to do by the end of the lesson

4. **content_nodes** (array): 3-7 teaching segments that form the lesson structure
   - Each node represents a distinct teaching moment or concept
   - Nodes should be sequenced in logical teaching order

## Content Node Structure

Each content node must include:

**Required fields:**
- `node_id` (string): Unique identifier for the node (e.g., "intro_01", "concept_01", "concept_02")
- `title` (string): Short, student-friendly title for this segment
- `concept` (string): One clear sentence explaining the core idea being taught
- `check_for_understanding` (string): A Socratic question or prompt to verify the student comprehends before moving on

**Optional fields** (include only when truly necessary for the specific content):
- `voice_hook` (string): For introductory nodes only - an engaging question or statement to capture student attention
- `vocabulary` (array): Include only if introducing 2-4 essential new terms that are critical to understanding
- `required_for_next` (boolean): Set to true only if mastery of this node is mandatory before proceeding

5. **assessment_logic** (object): Defines how student mastery is evaluated
   - `exit_quiz_type` (string): Type of assessment (options: "Socratic Discussion", "Problem Set", "Explanation Task", "Demonstration")
   - `min_mastery_score` (number): Decimal between 0 and 1 representing the minimum score to pass (typically 0.7-0.85)

6. **guardrails** (object): Boundaries for the AI tutor's behavior
   - `forbidden_topics` (array): List of concepts that are too advanced, off-scope, or inappropriate for this lesson
   - `tone_setting` (string): Brief description of the AI tutor's voice personality appropriate to the grade level

# Important Guidelines

- **Content Sequencing**: Design content nodes to build logically from foundational concepts to more complex ones. Each node should prepare the student for the next.

- **Age Appropriateness**: Ensure all language, concepts, and examples are suitable for the specified grade level. Elementary students need simpler language and more concrete examples; high school students can handle more abstract concepts.

- **Socratic Questions**: Make "check_for_understanding" questions guide discovery and reveal misconceptions, not just test recall. Good questions help students think through the concept rather than just repeat information.

- **Vocabulary**: Only include a vocabulary list when introducing essential terms that are critical to understanding the concept. Avoid listing terms that students likely already know.

- **Voice Hooks**: Use these sparingly - typically just for the first node to engage the student. They should be conversational and connect to student interests or prior knowledge.

- **Forbidden Topics**: Think about concepts that might derail the lesson or are beyond the scope. These might include advanced mathematical concepts, unrelated subject areas, or topics requiring prerequisite knowledge the student doesn't have.

- **Tone**: Match the personality to the grade level:
  - Elementary (K-5): Encouraging, playful, uses simple analogies
  - Middle School (6-8): Supportive, relatable, acknowledges student experiences
  - High School (9-12): Respectful, more mature, intellectually engaging

# Output Format

After completing your planning in <syllabus_planning> tags, output your complete syllabus as valid JSON inside <json_output> tags.

Ensure:
- All JSON syntax is correct (proper quotes, commas, brackets, no trailing commas)
- All strings are properly escaped
- The structure matches the specification exactly
- No text appears before or after the JSON within the json_output tags

Here is a minimal example structure (with placeholder values only - do not copy this content):

```json
{
  "module_id": "subj_00_example_topic",
  "metadata": {
    "subject": "Example Subject",
    "grade_level": 0,
    "estimated_duration_minutes": 0
  },
  "learning_objectives": [
    "Action verb + specific measurable outcome",
    "Action verb + specific measurable outcome",
    "Action verb + specific measurable outcome"
  ],
  "content_nodes": [
    {
      "node_id": "intro_01",
      "title": "Example Title",
      "concept": "One clear sentence explaining a core idea.",
      "voice_hook": "An engaging question or statement",
      "check_for_understanding": "A Socratic question to check comprehension"
    },
    {
      "node_id": "concept_01",
      "title": "Example Title",
      "concept": "One clear sentence explaining a core idea.",
      "vocabulary": ["term1", "term2"],
      "check_for_understanding": "A Socratic question to check comprehension",
      "required_for_next": true
    }
  ],
  "assessment_logic": {
    "exit_quiz_type": "Assessment Type",
    "min_mastery_score": 0.0
  },
  "guardrails": {
    "forbidden_topics": ["topic1", "topic2"],
    "tone_setting": "Description of voice personality"
  }
}
```

Begin your work now by planning in <syllabus_planning> tags, then output your final JSON in <json_output> tags.
'''