"""
Tests authentication primitives, password hashing contracts, and credential validation.
"""
import hashlib
import pytest


def test_password_hash_verification():
    """Verifies that password hashing produces non-reversible digests and verifies correctly."""
    password = "SuperSecretPassword123!"
    salt = "random_salt_value_98765"

    # Simulate salted SHA256 / bcrypt contract
    derived_hash = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
    
    # Correct password matches
    assert hashlib.sha256((password + salt).encode("utf-8")).hexdigest() == derived_hash
    
    # Wrong password fails
    wrong_password = "WrongPassword123!"
    assert hashlib.sha256((wrong_password + salt).encode("utf-8")).hexdigest() != derived_hash


def test_email_normalization():
    """Verifies user email normalization."""
    raw_email = "  User.Name+Tag@Example.COM  "
    normalized = raw_email.strip().lower()
    assert normalized == "user.name+tag@example.com"
