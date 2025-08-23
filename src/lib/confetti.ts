import confetti from "canvas-confetti";

/**
 * Fires side-cannon confetti for a duration.
 * @param durationMs default 3000ms
 * @param colors optional custom color palette
 */
export function triggerConfettiSideCannons(
    durationMs: number = 3000,
    colors: string[] = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"]
) {
    const end = Date.now() + durationMs;

    const frame = () => {
        if (Date.now() > end) return;

        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            startVelocity: 60,
            origin: { x: 0, y: 0.5 },
            colors,
        });
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            startVelocity: 60,
            origin: { x: 1, y: 0.5 },
            colors,
        });

        requestAnimationFrame(frame);
    };

    frame();
}
