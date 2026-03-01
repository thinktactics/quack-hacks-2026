#!/usr/bin/env bash

pip install -r backend/requirements.txt
npm --prefix frontend install

# Seed the database
python seed.py
