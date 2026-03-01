# Start backend and frontend in parallel, kill both on exit
trap 'kill 0' EXIT

python run.py &
npm --prefix frontend run dev &

wait
