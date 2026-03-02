"""
AI Tutor Service
Handles AI-powered tutoring conversations using OpenAI
"""
import os
from typing import Dict, List
from openai import OpenAI
from .provider_config import get_ai_provider_config

class AITutorService:
    def __init__(self):
        self.client = None
        self.model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
        self._client_signature = None
        self._refresh_client(force=True)

    def _refresh_client(self, force: bool = False):
        config = get_ai_provider_config()
        signature = (
            config.get('api_key', ''),
            config.get('base_url', ''),
            config.get('model', ''),
            bool(config.get('enabled')),
        )

        if not force and signature == self._client_signature:
            return

        self._client_signature = signature
        self.model = config.get('model') or self.model

        if config.get('configured') and config.get('enabled'):
            self.client = OpenAI(
                api_key=config.get('api_key'),
                base_url=config.get('base_url'),
            )
        else:
            self.client = None
        
    def generate_tutor_response(self, 
                                message: str, 
                                student_context: Dict = None,
                                conversation_history: List[Dict] = None) -> Dict:
        """
        Generate AI tutor response to student question
        
        Args:
            message: Student's question
            student_context: Dict with student info, courses, recent results
            conversation_history: Previous messages in conversation
            
        Returns:
            Dict with 'response' and 'tokens_used'
        """
        
        self._refresh_client()

        # Demo mode if no API key
        if not self.client:
            return {
                'response': self._get_demo_response(message),
                'tokens_used': 0,
                'is_demo': True
            }
        
        try:
            # Build system prompt with context
            system_prompt = self._build_system_prompt(student_context)
            
            # Build messages for OpenAI
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history
            if conversation_history:
                messages.extend(conversation_history)
            
            # Add current message
            messages.append({"role": "user", "content": message})
            
            # Call OpenAI
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            return {
                'response': response.choices[0].message.content,
                'tokens_used': response.usage.total_tokens,
                'is_demo': False
            }
            
        except Exception as e:
            # Fallback to demo response on error
            return {
                'response': f"I'm having trouble connecting right now. Demo response: {self._get_demo_response(message)}",
                'tokens_used': 0,
                'is_demo': True,
                'error': str(e)
            }
    
    def _build_system_prompt(self, student_context: Dict = None) -> str:
        """Build context-aware system prompt"""
        
        base_prompt = """You are an AI tutor for an e-learning platform. Your role is to:
- Help students understand concepts clearly
- Provide step-by-step explanations
- Encourage critical thinking
- Be patient and supportive"""
        
        if student_context:
            # personalization
            style = student_context.get('learning_style', 'visual')
            level = student_context.get('ai_explanation_level', 'normal')
            
            # Style adaptations
            if style == 'visual':
                base_prompt += "\n- Prioritize explaining with visual descriptions, analogies, and metaphors."
            elif style == 'reading':
                base_prompt += "\n- Provide detailed text explanations with bullet points and clear structure."
            elif style == 'practice':
                base_prompt += "\n- Focus on problem-solving steps and ask guiding questions to test understanding."
            
            # Level adaptations
            if level == 'simple':
                base_prompt += "\n- Use simple language (ELI5). Avoid jargon."
            elif level == 'exam':
                base_prompt += "\n- Focus on key terms, definitions, and how to structure answers for exams."
            else: # normal
                base_prompt += "\n- Use standard academic language suitable for the grade level."
                
            courses = student_context.get('courses', [])
            weak_areas = student_context.get('weak_topics', [])
            
            if courses:
                base_prompt += f"\n\nStudent is currently studying: {', '.join(courses)}"
            
            if weak_areas:
                base_prompt += f"\nAreas needing improvement: {', '.join(weak_areas)}"
        
        return base_prompt
    
    def _get_demo_response(self, message: str) -> str:
        """Generate demo response when API key not available"""
        
        # Simple keyword-based demo responses
        message_lower = message.lower()
        
        if 'math' in message_lower or 'equation' in message_lower:
            return """Great question! Let me help you with that math problem.

To solve equations, remember these key steps:
1. Simplify both sides if needed
2. Isolate the variable
3. Check your answer

Could you share the specific equation you're working on? I'll walk you through it step by step!"""
        
        elif 'science' in message_lower:
            return """Excellent question about science! 

Science concepts are best understood through examples and real-world connections. Can you tell me:
- What specific topic are you studying?
- What part is confusing?

I'll provide a clear explanation with examples!"""
        
        else:
            return f"""Thank you for your question! I'm here to help you learn.

To give you the best answer, could you provide more details about:
- Which subject or course this relates to?
- What you've tried so far?
- What specific part is challenging?

Let's work through this together!"""


    def get_chat_response(self, messages: List[Dict], context: Dict = None) -> str:
        """
        Adapter method to match usage in views/services.
        Extracts the last message and passes previous ones as history.
        Returns just the response string.
        """
        if not messages:
            return ""
            
        current_message = messages[-1]['content']
        history = messages[:-1]
        
        result = self.generate_tutor_response(current_message, context, history)
        return result['response']

    def generate_teacher_insights(self, data: Dict) -> List[str]:
        """
        Generate pedagogical insights for a teacher based on class performance data.
        """
        self._refresh_client()

        if not self.client:
            # Fallback for demo mode
            insights = []
            if data.get('at_risk_students'):
                insights.append(f"Action required: Several students are showing signs of academic risk. Focus on personalized support.")
            if data.get('topic_mastery'):
                weak_topics = [t['topic'] for t in data['topic_mastery'] if t['score'] < 65]
                if weak_topics:
                    insights.append(f"Curriculum Alert: Class performance is below benchmarks in {', '.join(weak_topics)}.")
            return insights or ["Class performance is currently meeting all benchmarks."]

        try:
            prompt = f"""
            You are an expert pedagogical analyst. Analyze the following class performance data and provide 2-3 specific, actionable insights for the teacher.
            
            Data:
            - Students at Risk: {data.get('at_risk_count')}
            - Risk Details: {data.get('at_risk_students')}
            - Topic Mastery: {data.get('topic_mastery')}
            
            Guidelines:
            - Keep insights concise and professional.
            - Provide specific recommendations (e.g., "Revisit Topic X", "Check in with Student Y").
            - Focus on identifying patterns or urgent needs.
            - Return the insights as a bulleted list.
            """

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful pedagogical assistant for teachers."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )

            content = response.choices[0].message.content
            # Split into list of strings, removing bullets
            insights = [line.strip().lstrip('- ').lstrip('* ') for line in content.split('\n') if line.strip()]
            return insights[:3] # Ensure at most 3 insights

        except Exception as e:
            print(f"AI Teacher Insight Error: {e}")
            return ["Analysis inhibited by service interruption. Please check student risk reports manually."]

# Singleton instance
ai_tutor_service = AITutorService()
