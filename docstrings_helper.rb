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
  legacy_start_line_number = nil
  legacy_end_line_number = nil
  legacy_matches_canonical_legacy_start_and_end_line_numbers = []

  lines.each_with_index do |line, index|
    line_number = index + 1

    case line
    when /^\s*#{Regexp.escape(DOC_COMMENT_START)}$/
      in_doc_comment = true
    when /^\s*#{Regexp.escape(COMMENT_END)}$/
      if canonical_docstring && canonical_docstring == legacy_docstring
        legacy_matches_canonical_legacy_start_and_end_line_numbers += [legacy_start_line_number, legacy_end_line_number]
      end
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
      if in_doc_comment
        in_legacy_docstring = true
        legacy_start_line_number = line_number
      end
    when /^\s*\* END LEGACY DOCSTRING$/
      if in_legacy_docstring
        in_legacy_docstring = false
        legacy_end_line_number = line_number
      end
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
  when 'mark-legacy-matches-canonical'
    new_lines = lines.each_with_index.map do |line, index|
      line_number = index + 1

      if legacy_matches_canonical_legacy_start_and_end_line_numbers.include?(line_number)
        line.sub('LEGACY', 'LEGACY-MATCHES-CANONICAL')
      else
        line
      end
    end
  else
    raise "Unrecognised argument #{ARGV[0]}."
  end

  File.open(filename, 'w') do |f|
    new_lines.each { |l| f << l }
  end
end
