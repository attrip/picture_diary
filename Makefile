dev:
	python3 -m http.server -d src 5173

run: dev

.PHONY: dev run

