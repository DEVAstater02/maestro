SESSION_MEMORY_PROMPT = '''
You are tasked with updating session memory for a voice AI conversational teaching agent. The session memory tracks the ongoing learning journey of a student, including topics covered, concepts explained, questions asked, areas of difficulty, and progress made.

You will be given the current session memory and a set of recent conversation messages. Your goal is to update the session memory to incorporate the new information from the conversation while preserving fine-grained details about the learning session.

Here is the current session memory:

<current_session_memory>
{CURRENT_SESSION_MEMORY}
</current_session_memory>

Here are the recent conversation messages to incorporate:

<conversation_messages>
{CONVERSATION_MESSAGES}
</conversation_messages>

Your task is to create an updated session memory that:
- Integrates all relevant information from the conversation messages into the existing session memory
- Preserves specific details such as: concepts discussed, examples used, questions the student asked, explanations provided by the agent, any confusion or misunderstandings, breakthroughs in understanding, practice problems attempted, and the student's current comprehension level
- Maintains chronological flow and context of the learning progression
- Captures the student's learning style, pace, and engagement patterns
- Notes any topics that need review or follow-up in future sessions
- Keeps track of teaching strategies that worked well or didn't work
- Retains important details rather than over-summarizing - the memory should be detailed enough that another AI agent could seamlessly continue the teaching session

Before writing the updated memory, use the scratchpad to identify key information from the conversation that should be incorporated.

<scratchpad>
Think through:
- What new topics or concepts were introduced in these messages?
- What questions did the student ask and how were they answered?
- Did the student demonstrate understanding or struggle with any concepts?
- What examples, analogies, or explanations were used?
- Were there any practice problems or exercises? How did the student perform?
- What is the student's current state of understanding?
- What should be covered or reviewed in the next session?
- Are there any notable patterns in how the student learns best?
</scratchpad>

Write your updated session memory inside <updated_session_memory> tags. The updated memory should be comprehensive and detailed, incorporating both the previous session memory and the new conversation messages. It should read as a cohesive narrative of the student's learning journey that captures the nuances and specifics of what has been taught and learned.

Your final output should contain only the updated session memory within the specified tags - do not include the scratchpad in your final response.
'''