

/*
===================================================================
-------------------------------------------------------------------
			GRID
-------------------------------------------------------------------
===================================================================
*/


class Grid {
	constructor() {
		this.gridElement = document.querySelector('#grid');
		this.gridElement.innerHTML = '';
		this.cards = [];
	}

	addCard(cardElement) {
		const newLen = this.cards.push(cardElement);
		this.gridElement.appendChild(this.cards[newLen - 1].getElement());
	}
}


/*
===================================================================
-------------------------------------------------------------------
			GAME
-------------------------------------------------------------------
===================================================================
*/

class Game {
	constructor(difficulty) {
		difficulty = parseInt(difficulty) || 1;

		document.addEventListener('click', (event) => { this.clickHandler(event) });

		this.timerBip = new Audio('./media/audio/bip.mp3');
		this.successSound = new Audio('./media/audio/success.mp3');
		this.failSound = new Audio('./media/audio/fail.mp3');
		this.timerElement = document.querySelector('#tourTimer');
		this.scoreElement = document.querySelector('#score');

		this.guessTimeoutId = null;
		this.guessCouple = [];
		this.state = {
			soundOn: true,
			timeOver: false,
			score: 0,
			win: false
		}
		this.rules = {
			guessTime: Math.floor(1000 / difficulty),
			tourTime: Math.floor(60 / difficulty)
		}

		const cardSetSize = this.computeCardSetSize();
		this.countdown = new Countdown();
		this.grid = new Grid();
		this.cardSet = this.pickRandomCardSet(cardSetSize);

		this.setCardsInGridRandomly();
	}

	/* GAME SETTINGS             -----------------------------------------------*/

	revealCardSetName() {
		setTimeout(() => {
			const cardSetNameElement = document.querySelector('.card-set-name');
			cardSetNameElement.innerText = `Playing: ${this.cardSet.getName()}`;
			cardSetNameElement.classList.add('reveal');
			setTimeout(() => {
				cardSetNameElement.classList.add('hide');
				cardSetNameElement.classList.remove('reveal');
			}, 4500);
		}, 1000);
	}

	pickRandomCardSet(cardSetSize) {
		const cardSets = [
			() => new RandomNbrCardSet(cardSetSize),
			() => new randomChineseWords(cardSetSize),
			() => new randomColorCardSet(cardSetSize),
		]

		return cardSets[Math.floor(Math.random() * cardSets.length)]();
	}

	/* USER INTERACTIONS         -----------------------------------------------*/

	isValidClick(event) {
		return event.target.classList.contains('card')
			&& !event.target.classList.contains('success')
			&& this.guessCouple.length < 2
			&& !this.state.timeOver
			&& !this.state.win;
	}

	clickHandler(event) {
		if (this.isValidClick(event)) {
			const clickedCard = this.cardSet.findCard(elem =>
				elem.getElement() === event.target
			);
			if (clickedCard && !clickedCard.getSneakPeakState()) {
				clickedCard.setSneakPeak(this.rules.guessTime);
				this.addToGuess(clickedCard);
			}
		}
	}

	addToGuess(card) {
		if (this.guessCouple.length < 2) {
			this.guessCouple.push(card);
			this.guessCouple.length < 2 ? this.waitForSecondCard() : this.checkGuess();
		}
	}

	checkGuess() {
		this.clearWaiting();
		const sameCards = this.cardSet.cardCmp(this.guessCouple[0], this.guessCouple[1]);
		sameCards ? this.manageCorrectGuess() : this.abortGuess(true);
	}

	waitForSecondCard() {
		this.guessTimeoutId = setTimeout(() => {
			this.abortGuess(true);
		}, 800 + this.rules.guessTime);
	}

	clearWaiting() {
		if (this.guessTimeoutId) {
			clearInterval(this.guessTimeoutId);
			this.guessTimeoutId = null;
		}
	}

	abortGuess(isFailure) {
		if (isFailure) {
			this.guessCouple.forEach(card => {
				card.unsetSneakPeak();
				setTimeout(() => {
					if (!this.state.timeOver && !card.isFound()) {
						this.failSound.play().catch(() => { });
						card.hideCard(true);
					}
					this.guessCouple = [];
				}, 200);
			})
		} else {
			this.guessCouple = [];
		}
	}

	manageCorrectGuess() {
		clearTimeout(this.guessTimeoutId);
		this.guessTimeoutId = null;
		this.successSound.play().catch(() => { });

		this.guessCouple.forEach(card => {
			card.setCardAsFound()
			card.revealCard()
		})
		this.incrementScore();
		this.guessCouple = [];
		this.nextTour();
	}

	incrementScore() {
		this.state.score++;
		this.scoreElement.innerText = this.state.score;
	}

	nextTour() {
		this.countdown.stop();
		this.startTimer();
		if (this.cardSet.isAllFound()) {
			this.endGame('win');
		}
	}

	/* GRID MANIPULATION METHODS -----------------------------------------------*/

	setCardsInGridRandomly() {
		const tmpCards = [...this.cardSet.cards];
		while (tmpCards.length) {
			const randomIndex = Math.floor(Math.random() * tmpCards.length);
			const randomCard = tmpCards.splice(randomIndex, 1);
			this.grid.addCard(randomCard[0]);
		}
	}

	// for debug purposes
	setCardsInGridInOrder() {
		for (let i = 0; i < this.cardSet.cards.length; i++) {
			this.grid.addCard(this.cardSet.cards[i]);
		}
	}

	computeCardSetSize() {
		let nbOfCards = 16;
		if (window.innerWidth < 670 || window.innerHeight < 800) {
			nbOfCards = 10
		}
		return Math.floor(nbOfCards / 2);
	}

	/* TIMER MANIPULATIONS       -----------------------------------------------*/

	startTimer() {
		this.timerElement.classList.remove('countdown-reach-limit');
		this.countdown.start(this.rules.tourTime, () => {
			this.timerCallback()
		});
	}

	timerCallback() {
		if (!this.state.timeOver) {
			this.renderTime(this.countdown.getRemainingSeconds(), this.countdown.split());
			if (this.countdown.getRemainingSeconds() <= 0) {
				this.state.timeOver = true;
				this.endGame();
			}
		}
	}

	startGame() {
		this.revealCardSetName();
		this.startTimer();
		return new Promise((resolve, reject) => {
			const intervalId = setInterval(() => {
				if (this.state.timeOver && !this.state.win) {
					clearInterval(intervalId);
					reject();
				} else if (this.state.timeOver || this.state.win) {
					clearInterval(intervalId);
					resolve();
				}
			}, 1000);
		});
	}

	endGame(hasWin) {
		if (hasWin && hasWin === 'win') {
			this.state.win = true;
			this.timerElement.classList.remove('countdown-reach-limit');
			this.timerElement.classList.add('countdown-win');
		}
		this.clearWaiting();
		this.countdown.stop();
		this.cardSet.revealAllCards();
	}

	setVolume(muted) {
		this.successSound.muted = muted
		this.failSound.muted = muted
		this.timerBip.muted = muted
	}

	renderTime(remainingSeconds, timeStr) {
		if (remainingSeconds >= 0) {
			this.timerElement.innerText = timeStr;

			if (remainingSeconds < 10) {
				this.timerElement.classList.toggle('countdown-reach-limit');

				// play bip warning the end ofcountdown
				if (this.timerBip && !this.timerBip.muted && remainingSeconds <= 10) {
					this.timerBip.play().catch((e) => { });
				}
			}
		} else {
			this.timerElement.classList.add('countdown-reach-limit');
		}
	}
}


