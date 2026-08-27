import React from 'react';
import { QuizPerson } from '../utils/quiz';

interface QuizCardChoiceProps {
  person: QuizPerson;
  imageSrc: string;
  disabled: boolean;
  selected: boolean;
  revealed: boolean;
  isAnswer: boolean;
  onSelect: () => void;
}

export const QuizCardChoice: React.FC<QuizCardChoiceProps> = ({
  person,
  imageSrc,
  disabled,
  selected,
  revealed,
  isAnswer,
  onSelect,
}) => {
  const className = [
    'quiz-choice',
    selected ? 'quiz-choice--selected' : '',
    revealed && isAnswer ? 'quiz-choice--correct' : '',
    revealed && selected && !isAnswer ? 'quiz-choice--wrong' : '',
    revealed && !isAnswer && !selected ? 'quiz-choice--dim' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={person.name}
    >
      <span className="quiz-choice__art">
        <img src={imageSrc} alt="" />
      </span>
      <span className="quiz-choice__name">{person.name}</span>
      {revealed && isAnswer && (
        <span className="quiz-choice__stamp" aria-hidden="true">Bestätigt</span>
      )}
    </button>
  );
};
