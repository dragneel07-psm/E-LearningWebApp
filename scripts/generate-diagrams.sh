#!/bin/bash

# Architecture Diagram Export Script
# Generates PNG images from Mermaid diagrams

set -e

echo "🎨 Architecture Diagram Export Script"
echo "======================================"

# Check if mermaid-cli is installed
if ! command -v mmdc &> /dev/null; then
    echo "❌ mermaid-cli not found. Installing..."
    npm install -g @mermaid-js/mermaid-cli
    echo "✅ mermaid-cli installed"
fi

# Create output directory
OUTPUT_DIR=".agent/architecture/diagrams"
mkdir -p "$OUTPUT_DIR"

echo ""
echo "📁 Output directory: $OUTPUT_DIR"
echo ""

# Source file
SOURCE_FILE=".agent/architecture/architecture-diagrams.md"

if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Source file not found: $SOURCE_FILE"
    exit 1
fi

echo "📄 Source file: $SOURCE_FILE"
echo ""

# Extract and generate each diagram
echo "🔨 Generating diagrams..."
echo ""

# Function to extract diagram by section
extract_diagram() {
    local section_number=$1
    local diagram_name=$2
    local temp_file="$OUTPUT_DIR/temp_${diagram_name}.mmd"
    local output_file="$OUTPUT_DIR/${diagram_name}.png"
    
    echo "  [$section_number/12] Generating: $diagram_name.png"
    
    # Extract the mermaid code block for this diagram
    # This is a simplified extraction - adjust based on actual file structure
    awk "/## $section_number\./,/^```$/" "$SOURCE_FILE" | \
        sed -n '/^```mermaid$/,/^```$/p' | \
        sed '1d;$d' > "$temp_file"
    
    if [ -s "$temp_file" ]; then
        # Generate PNG
        mmdc -i "$temp_file" -o "$output_file" -b transparent -w 1920 -H 1080 2>/dev/null || true
        rm "$temp_file"
        
        if [ -f "$output_file" ]; then
            echo "     ✅ Generated successfully"
        else
            echo "     ⚠️  Failed to generate"
        fi
    else
        echo "     ⚠️  No diagram found"
        rm "$temp_file"
    fi
}

# Generate all diagrams
extract_diagram "1" "01-system-architecture"
extract_diagram "2" "02-multi-tenant-architecture"
extract_diagram "3" "03-authentication-flow"
extract_diagram "4" "04-multi-tenant-request-flow"
extract_diagram "5" "05-ai-integration"
extract_diagram "6" "06-data-model"
extract_diagram "7" "07-api-architecture"
extract_diagram "8" "08-frontend-architecture"
extract_diagram "9" "09-deployment-architecture"
extract_diagram "10" "10-security-architecture"
extract_diagram "11" "11-cicd-pipeline"
extract_diagram "12" "12-monitoring-observability"

echo ""
echo "✅ Diagram generation complete!"
echo ""
echo "📊 Generated files:"
ls -lh "$OUTPUT_DIR"/*.png 2>/dev/null || echo "  No PNG files generated"
echo ""
echo "💡 Tip: You can also view diagrams directly on GitHub or in VS Code with Mermaid extension"
