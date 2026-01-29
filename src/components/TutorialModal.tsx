import React, { useMemo, useState } from 'react';

const tutorialSteps = [
  {
    title: 'Willkommen bei Milchcards',
    body: 'Baue dein Deck, starte ein Match und lerne die Kernmechaniken. Dieser kurze Guide zeigt dir die wichtigsten Zonen, Slots und Aktionen.',
  },
  {
    title: 'Regierungs- & Öffentlichkeitsreihe',
    body: 'Spiele Politiker in die Regierungsreihe (außen) oder Öffentlichkeitsreihe (innen). Deine Einflusswerte bestimmen, wer eine Runde gewinnt.',
  },
  {
    title: 'Dauerhafte Initiativen',
    body: 'Dauerhafte Initiativen werden in die zwei permanenten Slots gelegt. Sie bleiben liegen und geben dir langfristige Vorteile.',
  },
  {
    title: 'Sofort-Initiativen',
    body: 'Sofort-Initiativen werden in den Sofort-Slot gelegt und können danach direkt aktiviert werden. Achte auf die AP-Kosten.',
  },
  {
    title: 'Interventionen',
    body: 'Interventionen landen im Intervention-Slot. Sie beeinflussen das Spielgeschehen und können starke Effekte auslösen.',
  },
  {
    title: 'Zug & Handkarten',
    body: 'Wähle eine Handkarte aus, spiele sie in einen passenden Slot und beende deinen Zug. Mit dem Info-Panel behältst du Einfluss und AP im Blick.',
  },
];

interface TutorialModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isVisible, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const step = useMemo(() => tutorialSteps[stepIndex], [stepIndex]);

  if (!isVisible) return null;

  return (
    <div className="tutorial-modal" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-modal__panel">
        <header className="tutorial-modal__header">
          <h2 id="tutorial-title">{step.title}</h2>
          <button type="button" className="tutorial-modal__close" onClick={onClose} aria-label="Tutorial schließen">
            ✕
          </button>
        </header>
        <p className="tutorial-modal__body">{step.body}</p>
        <div className="tutorial-modal__footer">
          <span className="tutorial-modal__progress">Schritt {stepIndex + 1} von {tutorialSteps.length}</span>
          <div className="tutorial-modal__actions">
            <button
              type="button"
              className="tutorial-modal__button"
              onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
              disabled={stepIndex === 0}
            >
              Zurück
            </button>
            {stepIndex < tutorialSteps.length - 1 ? (
              <button
                type="button"
                className="tutorial-modal__button tutorial-modal__button--primary"
                onClick={() => setStepIndex((prev) => Math.min(prev + 1, tutorialSteps.length - 1))}
              >
                Weiter
              </button>
            ) : (
              <button
                type="button"
                className="tutorial-modal__button tutorial-modal__button--primary"
                onClick={onClose}
              >
                Los geht's
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
