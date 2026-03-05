import os
import json
from openai import OpenAI
from .provider_config import get_ai_provider_config

class GradingService:
    def __init__(self):
        self.client = None
        self.model = os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
        self._client_signature = None
        self._client_init_error = None
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
        self._client_init_error = None

        if config.get('configured') and config.get('enabled'):
            try:
                self.client = OpenAI(
                    api_key=config.get('api_key'),
                    base_url=config.get('base_url'),
                    default_headers=config.get('request_headers') or None,
                    timeout=float(os.getenv('OPENAI_TIMEOUT_SECONDS', '30')),
                )
            except Exception as exc:
                self.client = None
                self._client_init_error = str(exc)
        else:
            self.client = None

    def grade_submission(self, question_text, student_answer, correct_answer=None, total_points=10):
        """
        Grade a student submission using AI.
        Returns dict: { 'score': float, 'feedback': str }
        """
        self._refresh_client()

        if not self.client:
            return self._get_demo_grade(student_answer, total_points, error=self._client_init_error)

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
        """Fallback heuristic grading when AI provider is unavailable."""
        words = len(answer.split())
        
        # Heuristic scoring fallback
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
            feedback += f" (AI provider temporarily unavailable; fallback rubric used. Error: {error})"
            
        return {
            "score": round(score, 1),
            "feedback": feedback
        }

grading_service = GradingService()
