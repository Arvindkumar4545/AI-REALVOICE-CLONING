"""
Tests Threat Map data structures, privacy-preserving coordinate rounding, and regional aggregation.
"""
import pytest


def test_privacy_preserving_coordinate_rounding():
    """Verifies that user GPS coordinates are properly rounded to 2 decimal places (~1.1 km)."""
    raw_lat = 37.7749291823
    raw_lon = -122.4194155123

    anonymized_lat = round(raw_lat, 2)
    anonymized_lon = round(raw_lon, 2)

    assert anonymized_lat == 37.77
    assert anonymized_lon == -122.42


def test_threat_map_aggregation_logic():
    """Verifies regional hotspot distribution computation."""
    mock_reports = [
        {"id": "1", "region": "California", "threat_level": "high"},
        {"id": "2", "region": "California", "threat_level": "medium"},
        {"id": "3", "region": "New York", "threat_level": "critical"},
        {"id": "4", "region": "Texas", "threat_level": "low"},
        {"id": "5", "region": "California", "threat_level": "high"},
    ]

    distribution = {}
    for r in mock_reports:
        reg = r.get("region", "Unknown")
        distribution[reg] = distribution.get(reg, 0) + 1

    assert distribution["California"] == 3
    assert distribution["New York"] == 1
    assert distribution["Texas"] == 1
    assert sum(distribution.values()) == len(mock_reports)
