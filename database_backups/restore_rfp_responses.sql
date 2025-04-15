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
-- Name: rfp_responses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.rfp_responses (
    id integer NOT NULL,
    client_name text NOT NULL,
    client_industry text NOT NULL,
    rfp_title text NOT NULL,
    rfp_id text,
    submission_date date NOT NULL,
    budget_range text,
    project_summary text NOT NULL,
    company_name text NOT NULL,
    point_of_contact text NOT NULL,
    company_strengths text,
    selected_template text NOT NULL,
    customizations text,
    generated_content text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.rfp_responses OWNER TO neondb_owner;

--
-- Name: rfp_responses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.rfp_responses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rfp_responses_id_seq OWNER TO neondb_owner;

--
-- Name: rfp_responses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.rfp_responses_id_seq OWNED BY public.rfp_responses.id;


--
-- Name: rfp_responses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rfp_responses ALTER COLUMN id SET DEFAULT nextval('public.rfp_responses_id_seq'::regclass);


--
-- Name: rfp_responses rfp_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.rfp_responses
    ADD CONSTRAINT rfp_responses_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

