from academic.models.question import Question

class GradingService:
    @staticmethod
    def grade_submission(assessment, answers_data):
        """
        Grades an assessment submission.
        answers_data: { question_id: user_answer_text_or_key }
        Returns: (total_score, max_possible, graded_answers_dict)
        """
        questions = Question.objects.filter(assessment=assessment)
        total_score = 0
        max_possible = 0
        graded_answers = {}

        for q in questions:
            user_answer = answers_data.get(str(q.question_id))
            is_correct = False
            points_earned = 0
            
            if q.type == 'mcq':
                # Exact match for MCQ
                if user_answer == q.correct_answer:
                    is_correct = True
                    points_earned = q.points
            elif q.type == 'short_answer':
                # Basic case-insensitive matching for short answers
                if user_answer and q.correct_answer and \
                   user_answer.strip().lower() == q.correct_answer.strip().lower():
                    is_correct = True
                    points_earned = q.points
            # Long answers/essays require manual grading or AI grading later
            
            graded_answers[str(q.question_id)] = {
                'answer': user_answer,
                'correct': is_correct,
                'points_earned': points_earned,
                'max_points': q.points
            }
            
            total_score += points_earned
            max_possible += q.points

        return total_score, max_possible, graded_answers
