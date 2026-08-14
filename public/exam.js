function startTimer(minutes, timerId, formId) {

    let seconds = minutes * 60;

    const timer =
        document.getElementById(timerId);

    const form =
        document.getElementById(formId);

    function updateTimer() {

        const minutesLeft =
            Math.floor(seconds / 60);

        const secondsLeft =
            seconds % 60;

        timer.textContent =
            "Time: " +
            minutesLeft +
            ":" +
            String(secondsLeft).padStart(2, "0");

        if (seconds <= 0) {

            clearInterval(interval);

            alert(
                "Time is over. Exam will be submitted."
            );

            form.submit();

            return;
        }

        seconds--;
    }

    updateTimer();

    const interval =
        setInterval(updateTimer, 1000);
}

function confirmSubmit() {

    return confirm(
        "Are you sure you want to submit?"
    );

}