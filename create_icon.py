#!/usr/bin/env python3
import struct
import zlib

# Create 128x128 PNG with blue background
width, height = 128, 128

# PNG signature
png_sig = b'\x89PNG\r\n\x1a\n'

# IHDR chunk (image header)
ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)

# IDAT chunk (image data) - solid blue
raw_data = b''
for y in range(height):
    raw_data += b'\x00'  # filter type
    for x in range(width):
        raw_data += bytes([0, 122, 204])  # RGB blue

compressed = zlib.compress(raw_data)
idat_crc = zlib.crc32(b'IDAT' + compressed) & 0xffffffff
idat_chunk = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)

# IEND chunk
iend_crc = zlib.crc32(b'IEND') & 0xffffffff
iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)

# Write PNG
with open('images/icon.png', 'wb') as f:
    f.write(png_sig + ihdr_chunk + idat_chunk + iend_chunk)

print('Icon created successfully')
