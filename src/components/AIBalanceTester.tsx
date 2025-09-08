import React, { useState, useCallback } from 'react';
import { ProperAIVsAiTester, ProperAITestResult, ProperBalanceMetrics } from '../ai/properAiVsAiTester';

interface AIBalanceTesterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIBalanceTester: React.FC<AIBalanceTesterProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ProperAITestResult[]>([]);
  const [balanceMetrics, setBalanceMetrics] = useState<ProperBalanceMetrics[]>([]);
  const [validationSummary, setValidationSummary] = useState<{ totalErrors: number; errorTypes: Map<string, number> }>({ totalErrors: 0, errorTypes: new Map() });
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [iterations, setIterations] = useState(50);
  const [maxRounds, setMaxRounds] = useState(30);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(['medium']);

  const tester = new ProperAIVsAiTester();

  const runBalanceTest = useCallback(async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    setBalanceMetrics([]);
    setValidationSummary({ totalErrors: 0, errorTypes: new Map() });
    setRecommendations([]);

    try {
      console.log('🧪 Starting AI vs AI balance test...');

      const testResults = await tester.runBalanceTest(
        iterations,
        selectedDifficulties,
        maxRounds
      );

      setResults(testResults.results);
      setBalanceMetrics(testResults.balanceMetrics);
      setValidationSummary(testResults.validationSummary);
      setRecommendations(testResults.recommendations);
      setProgress(100);

      console.log('✅ Balance test completed!', testResults);
    } catch (error) {
      console.error('❌ Balance test failed:', error);
    } finally {
      setIsRunning(false);
    }
  }, [iterations, selectedDifficulties, maxRounds, tester]);

  const exportResults = useCallback(() => {
    tester.exportResults(`ai_balance_test_${new Date().toISOString().split('T')[0]}.json`);
  }, [tester]);

  const toggleDifficulty = useCallback((difficulty: string) => {
    setSelectedDifficulties(prev =>
      prev.includes(difficulty)
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    );
  }, []);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#0d1621',
        border: '2px solid #1f3042',
        borderRadius: '12px',
        padding: '24px',
        width: '90vw',
        height: '90vh',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1f3042',
          paddingBottom: '16px',
        }}>
          <h2 style={{
            margin: 0,
            color: '#eaf3ff',
            fontSize: '24px',
            fontWeight: 'bold',
          }}>
            🤖 AI vs AI Balance Tester
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Configuration */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          padding: '16px',
          background: '#1a2332',
          borderRadius: '8px',
        }}>
          <div>
            <label style={{ color: '#eaf3ff', fontSize: '14px', fontWeight: 'bold' }}>
              Iterations per matchup:
            </label>
            <input
              type="number"
              value={iterations}
              onChange={(e) => setIterations(parseInt(e.target.value) || 50)}
              min="1"
              max="1000"
              disabled={isRunning}
              style={{
                width: '100%',
                padding: '8px',
                background: '#0d1621',
                border: '1px solid #1f3042',
                borderRadius: '4px',
                color: '#eaf3ff',
                marginTop: '4px',
              }}
            />
          </div>

          <div>
            <label style={{ color: '#eaf3ff', fontSize: '14px', fontWeight: 'bold' }}>
              Max rounds per game:
            </label>
            <input
              type="number"
              value={maxRounds}
              onChange={(e) => setMaxRounds(parseInt(e.target.value) || 30)}
              min="5"
              max="100"
              disabled={isRunning}
              style={{
                width: '100%',
                padding: '8px',
                background: '#0d1621',
                border: '1px solid #1f3042',
                borderRadius: '4px',
                color: '#eaf3ff',
                marginTop: '4px',
              }}
            />
          </div>

          <div>
            <label style={{ color: '#eaf3ff', fontSize: '14px', fontWeight: 'bold' }}>
              AI Difficulties:
            </label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              {['easy', 'medium', 'hard'].map(difficulty => (
                <button
                  key={difficulty}
                  onClick={() => toggleDifficulty(difficulty)}
                  disabled={isRunning}
                  style={{
                    padding: '6px 12px',
                    background: selectedDifficulties.includes(difficulty) ? '#10b981' : '#374151',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    textTransform: 'capitalize',
                  }}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
        }}>
          <button
            onClick={runBalanceTest}
            disabled={isRunning || selectedDifficulties.length === 0}
            style={{
              background: isRunning ? '#6b7280' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            {isRunning ? '🔄 Running...' : '🚀 Start Balance Test'}
          </button>

          {results.length > 0 && (
            <button
              onClick={exportResults}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              📊 Export Results
            </button>
          )}
        </div>

        {/* Progress */}
        {isRunning && (
          <div style={{
            background: '#1a2332',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ color: '#eaf3ff', marginBottom: '8px' }}>
              Running AI vs AI tests... {progress}%
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#374151',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: '#10b981',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            flex: 1,
            overflow: 'auto',
          }}>
            {/* Deck Balance Metrics */}
            <div style={{
              background: '#1a2332',
              borderRadius: '8px',
              padding: '16px',
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                color: '#eaf3ff',
                fontSize: '18px',
                fontWeight: 'bold',
              }}>
                📊 Deck Balance Metrics
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '300px',
                overflow: 'auto',
              }}>
                {balanceMetrics.map(deck => (
                  <div
                    key={deck.deckName}
                    style={{
                      background: deck.performance === 'overpowered' ? '#dc2626' :
                                 deck.performance === 'underpowered' ? '#3b82f6' : '#10b981',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {deck.deckName}
                    </div>
                    <div>Win Rate: {(deck.winRate * 100).toFixed(1)}% ({deck.wins}/{deck.totalGames})</div>
                    <div>Avg Rounds: {deck.avgRounds.toFixed(1)}</div>
                    <div>Avg Influence: {deck.avgInfluence.toFixed(1)}</div>
                    <div style={{
                      fontSize: '12px',
                      marginTop: '4px',
                      textTransform: 'uppercase',
                      fontWeight: 'bold',
                    }}>
                      {deck.performance}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Summary */}
            <div style={{
              background: '#1a2332',
              borderRadius: '8px',
              padding: '16px',
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                color: '#eaf3ff',
                fontSize: '18px',
                fontWeight: 'bold',
              }}>
                🔍 Validation Summary
              </h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '300px',
                overflow: 'auto',
              }}>
                <div style={{
                  background: validationSummary.totalErrors === 0 ? '#10b981' : '#dc2626',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    Total Validation Errors: {validationSummary.totalErrors}
                  </div>
                  <div>
                    {validationSummary.totalErrors === 0
                      ? '✅ All tests passed validation!'
                      : '❌ Issues found in game logic'}
                  </div>
                </div>

                {validationSummary.errorTypes.size > 0 && (
                  <div style={{
                    background: '#374151',
                    color: 'white',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Error Types:</div>
                    {Array.from(validationSummary.errorTypes.entries()).map(([type, count]) => (
                      <div key={type} style={{ marginBottom: '4px' }}>
                        {type}: {count} occurrences
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div style={{
            background: '#1a2332',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              color: '#eaf3ff',
              fontSize: '18px',
              fontWeight: 'bold',
            }}>
              💡 Balance Recommendations
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '200px',
              overflow: 'auto',
            }}>
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  style={{
                    background: '#0d1621',
                    border: '1px solid #1f3042',
                    padding: '12px',
                    borderRadius: '6px',
                    color: '#eaf3ff',
                    fontSize: '14px',
                    lineHeight: '1.4',
                  }}
                >
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        {results.length > 0 && (
          <div style={{
            background: '#1a2332',
            borderRadius: '8px',
            padding: '16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#eaf3ff', fontSize: '24px', fontWeight: 'bold' }}>
                {results.length}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '14px' }}>Total Games</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#eaf3ff', fontSize: '24px', fontWeight: 'bold' }}>
                {(results.reduce((sum, r) => sum + r.rounds, 0) / results.length).toFixed(1)}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '14px' }}>Avg Rounds</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#eaf3ff', fontSize: '24px', fontWeight: 'bold' }}>
                {(results.reduce((sum, r) => sum + r.duration, 0) / results.length / 1000).toFixed(1)}s
              </div>
              <div style={{ color: '#9ca3af', fontSize: '14px' }}>Avg Duration</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#eaf3ff', fontSize: '24px', fontWeight: 'bold' }}>
                {validationSummary.totalErrors}
              </div>
              <div style={{ color: '#9ca3af', fontSize: '14px' }}>Validation Errors</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
