-- Migration: Create enquiry_followups table
-- Run this SQL against your PostgreSQL database

CREATE TABLE IF NOT EXISTS enquiry_followups (
    id SERIAL PRIMARY KEY,
    enquiry_id INT NOT NULL,
    enquiry_type VARCHAR(20) NOT NULL CHECK (enquiry_type IN ('b2c', 'corporate')),
    followup_number INT NOT NULL CHECK (followup_number BETWEEN 1 AND 3),
    followup_date DATE NOT NULL,
    followup_status VARCHAR(50) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(enquiry_id, enquiry_type, followup_number)
);

CREATE INDEX IF NOT EXISTS idx_enquiry_followups_enquiry ON enquiry_followups(enquiry_id, enquiry_type);
CREATE INDEX IF NOT EXISTS idx_enquiry_followups_status ON enquiry_followups(followup_status);
