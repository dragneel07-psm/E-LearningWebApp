import os
import json
from openai import OpenAI

class GradingService:
    def __init__(self):
        # Initialize OpenAI client
        api_key = os.getenv('OPENAI_API_KEY', 'demo-key')
        base_url = os.getenv('OPENAI_BASE_URL')
        self.client = (
            OpenAI(api_key=api_key, base_url=base_url) if base_url else OpenAI(api_key=api_key)
        ) if api_key != 'demo-key' else None
        self.model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')

    def grade_submission(self, question_text, student_answer, correct_answer=None, total_points=10):
        """
        Grade a student submission using AI.
        Returns dict: { 'score': float, 'feedback': str }
        """
        if not self.client:
            return self._get_demo_grade(student_answer, total_points)

        try:
            prompt = f"""
            You are an expert teacher grading a student's answer.
            
            Question: {question_text}
            Correct Answer/Rubric: {correct_answer if correct_answer else "Evaluate based on general knowledge and correctness."}
            Student Answer: {student_answer}
            Total Points Available: {total_points}

            Evaluate the answer constraints:
            1. Accuracy of facts.
            2. Clarity of explanation.
            3. Completeness.

            Provide your response in JSON format:
            {{
                "score": <numeric_score_out_of_total>,
                "feedback": "<constructive_feedback_string>"
            }}
            """

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a fair and constructive precision grader."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            content = response.choices[0].message.content
            result = json.loads(content)
            return result

        except Exception as e:
            print(f"Grading Error: {e}")
            return self._get_demo_grade(student_answer, total_points, error=str(e))

    def _get_demo_grade(self, answer, total_points, error=None):
        """Fallback mock grading"""
        words = len(answer.split())
        
        # Simple heuristic for demo
        if words < 5:
            score = total_points * 0.2
            feedback = "The answer is too short. Please elaborate more."
        elif words < 20:
            score = total_points * 0.7
            feedback = "Good effort, but you could provide more specific details."
        else:
            score = total_points * 0.9
            feedback = "Excellent answer! Detailed and well-explained."

        if error:
            feedback += f" (Note: AI Service unavailable, using demo grading. Error: {error})"
            
        return {
            "score": round(score, 1),
            "feedback": feedback
        }

grading_service = GradingService()
