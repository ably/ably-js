#!/usr/bin/env ruby

DOC_COMMENT_START = "/**"
COMMENT_END = "*/"

['ably.d.ts', 'callbacks.d.ts', 'promises.d.ts'].each do |filename|
  lines = File.read(filename).lines

  in_doc_comment = false
  in_canonical_docstring = false
  in_legacy_docstring = false
  canonical_docstring = nil
  legacy_docstring = nil
  canonical_start_line_number = nil
  canonical_end_line_number = nil
  canonical_with_params_start_line_numbers = []
  canonical_has_params = false

  lines.each_with_index do |line, index|
    line_number = index + 1

    case line
    when /^\s*#{Regexp.escape(DOC_COMMENT_START)}$/
      in_doc_comment = true
    when /^\s*#{Regexp.escape(COMMENT_END)}$/
      in_doc_comment = false
      canonical_docstring = nil
      legacy_docstring = nil
    when /^\s*\* BEGIN CANONICAL DOCSTRING$/
      if in_doc_comment
        in_canonical_docstring = true
        canonical_start_line_number = line_number
      end
    when /^\s*\* END CANONICAL DOCSTRING$/
      if in_canonical_docstring
        in_canonical_docstring = false
        canonical_has_params = false
        canonical_end_line_number = line_number
      end
    when /^\s*\* BEGIN LEGACY DOCSTRING$/
      in_legacy_docstring = true if in_doc_comment
    when /^\s*\* END LEGACY DOCSTRING$/
      in_legacy_docstring = false if in_legacy_docstring
    when /^\s*\*(.*)/
      if line =~ /@param/ && in_canonical_docstring
        canonical_with_params_start_line_numbers << canonical_start_line_number
      end

      if in_canonical_docstring
        canonical_docstring ||= ''
        canonical_docstring += "\n#{line}"
      end

      if in_legacy_docstring
        legacy_docstring ||= ''
        legacy_docstring += "\n#{line}"
      end
    end
  end

  new_lines = nil

  case ARGV[0]
  when 'mark-canonical-with-params'
    new_lines = lines.each_with_index.map do |line, index|
      line_number = index + 1

      if canonical_with_params_start_line_numbers.include?(line_number)
        ["CANONICAL WITH PARAMS\n", line]
      else
        line
      end
    end.flatten
  else
    raise "Unrecognised argument #{ARGV[0]}."
  end

  File.open(filename, 'w') do |f|
    new_lines.each { |l| f << l }
  end
end
