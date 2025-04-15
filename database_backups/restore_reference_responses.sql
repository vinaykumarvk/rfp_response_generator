--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: reference_responses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reference_responses (
    id integer NOT NULL,
    response_id integer NOT NULL,
    category text NOT NULL,
    requirement text NOT NULL,
    response text NOT NULL,
    reference text,
    score real NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reference_responses OWNER TO neondb_owner;

--
-- Name: reference_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.reference_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reference_responses_id_seq OWNER TO neondb_owner;

--
-- Name: reference_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.reference_responses_id_seq OWNED BY public.reference_responses.id;


--
-- Name: reference_responses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reference_responses ALTER COLUMN id SET DEFAULT nextval('public.reference_responses_id_seq'::regclass);


--
-- Name: reference_responses reference_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reference_responses
    ADD CONSTRAINT reference_responses_pkey PRIMARY KEY (id);


--
-- Name: reference_responses reference_responses_response_id_excel_requirement_responses_id_; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reference_responses
    ADD CONSTRAINT reference_responses_response_id_excel_requirement_responses_id_ FOREIGN KEY (response_id) REFERENCES public.excel_requirement_responses(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

