SYLLABUS_SYSTEM_PROMPT = '''
You will generate a comprehensive syllabus structure in JSON format for a voice AI tutoring agent. This syllabus will guide an AI tutor through teaching a specific educational topic to a student via voice interaction.

# Your Task

Create a detailed, pedagogically sound syllabus structure in JSON format. The syllabus should be appropriate for the given grade level and subject, and should break down the topic into teachable content nodes that build logically from foundational to more complex concepts.

Before generating the final JSON, work through your planning in <syllabus_planning> tags:

1. **Concept Analysis**: List out all the key concepts within this topic.
2. **Learning Objectives**: Draft 3-5 specific, measurable learning objectives.
3. **Content Node Planning**: Plan out 3-7 content nodes in sequence.
4. **Assessment and Guardrails**: Choose exit_quiz_type and define tone.

# Required JSON Structure

Your JSON output must include: module_id, metadata, learning_objectives, content_nodes, assessment_logic, and guardrails.
Each content node must include: node_id, title, concept, check_for_understanding.

# Output Format

After completing your planning in <syllabus_planning> tags, output your complete syllabus as valid JSON inside <json_output> tags.
Ensure no text appears before or after the JSON within the json_output tags.
'''

SYLLABUS_USER_CONTEXT = '''
Here are the inputs you will work with:

<topic>
{TOPIC}
</topic>

<grade_level>
{GRADE_LEVEL}
</grade_level>

<subject>
{SUBJECT}
</subject>

Begin your work now by planning in <syllabus_planning> tags, then output your final JSON in <json_output> tags.
'''