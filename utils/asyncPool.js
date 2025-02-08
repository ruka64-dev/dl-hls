export class AsyncPool {
	allPromises = []; // 残プロセス（pendingPromisesの方が良かったかも...）
	strict = false; // Promise.allで実行するか、Promise.allSettledで実行するか
	limit = 10; // 同時実行上限数
	count = {
		success: 0,
		error: 0,
	};

	constructor({ limit = 10, strict = false } = {}) {
		this.limit = limit;
		this.strict = strict;
	}

	addPromise(promise) {
		this.allPromises.push(promise);
	}

	clearPromises() {
		this.allPromises = [];
		this.count = {
			success: 0,
			error: 0,
		};
	}

	async run() {
		while (this.allPromises.length > 0) {
			const chunkPromises = this.allPromises.slice(0, this.limit).map((thePromise) => thePromise());
			this.allPromises.splice(0, this.limit);

			if (this.strict) {
				await Promise.all(chunkPromises);
			} else {
				const results = await Promise.allSettled(chunkPromises);

				results.map((theResult) => {
					switch (theResult.status) {
						case 'fulfilled':
							this.count.success++;
							break;
						case 'rejected':
							this.count.error++;
							break;
					}
				});
			}
		}

		console.log(`【AsyncPool】 OK: ${this.count.success} / NG: ${this.count.error}`);
		this.clearPromises();
	}

	getResultCount() {
		if (!this.strict) return this.count;
		console.warn('【注意】getResultCount() は stric: false でのみ利用できます。');
	}
}
